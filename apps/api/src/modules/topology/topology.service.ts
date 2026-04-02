import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import type { PathState } from '@xc/types';
import {
    InsufficientRoleError,
    InvalidTransitionError,
    TransitionGuardError,
} from '../../common/errors/domain.errors';
import { StateMachine } from '../../common/state-machine/state-machine';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { PortReservationService } from '../reservations/port-reservation.service';
import type { CreateCablePathDto, MarkInstalledDto } from './dto/cable-path.dto';
import { type PathGuardEntity, PATH_TRANSITIONS } from './path.lifecycle';

const pathMachine = new StateMachine<PathState, PathGuardEntity>(PATH_TRANSITIONS);

function toHttpException(err: unknown): never {
  if (err instanceof InvalidTransitionError) throw new BadRequestException(err.message);
  if (err instanceof InsufficientRoleError) throw new ForbiddenException(err.message);
  if (err instanceof TransitionGuardError) throw new UnprocessableEntityException(err.message);
  throw err;
}

@Injectable()
export class TopologyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
    private readonly portReservations: PortReservationService,
  ) {}

  async getCablePath(id: string) {
    return this.prisma.cablePath.findUniqueOrThrow({
      where: { id },
      include: {
        segments: {
          include: {
            fromPort: { include: { panel: { include: { rack: true, room: true } } } },
            toPort: { include: { panel: { include: { rack: true, room: true } } } },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });
  }

  async listPathsForService(serviceId: string) {
    return this.prisma.cablePath.findMany({
      where: { serviceId },
      include: {
        segments: {
          include: {
            fromPort: { select: { id: true, label: true } },
            toPort: { select: { id: true, label: true } },
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { pathRole: 'asc' },
    });
  }

  // Create a cable path and reserve all referenced ports atomically.
  // Business rules enforced here:
  // 1. No duplicate pathRole on the same service (one primary, one diverse max)
  // 2. All ports must be 'available'
  // 3. No port referenced twice within the same path
  async createCablePath(serviceId: string, dto: CreateCablePathDto, actorId: string) {
    await this.prisma.crossConnectService.findUniqueOrThrow({ where: { id: serviceId } });

    // Rule 1: duplicate pathRole check
    const existing = await this.prisma.cablePath.findFirst({
      where: { serviceId, pathRole: dto.pathRole, state: { not: 'decommissioned' } },
    });
    if (existing) {
      throw new ConflictException(`Service already has an active ${dto.pathRole} cable path`);
    }

    // Rule 3: no port duplicated within this path
    const allPortIds = dto.segments.flatMap((s) => [s.fromPortId, s.toPortId]);
    const uniquePortIds = new Set(allPortIds);
    if (uniquePortIds.size !== allPortIds.length) {
      throw new BadRequestException('The same port cannot appear twice in a cable path');
    }

    // Create path + segments first to get a cablePathId for the reservations.
    // This is left outside the port reservation transaction intentionally:
    // PortReservationService runs its own Serializable transaction which cannot
    // be nested. If reservation fails we delete the path as a compensating action.
    const path = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cablePath.create({
        data: {
          serviceId,
          pathRole: dto.pathRole,
          state: 'planned',
          notes: dto.notes,
          segments: {
            create: dto.segments.map((s) => ({
              sequence: s.sequence,
              fromPortId: s.fromPortId,
              toPortId: s.toPortId,
              segmentType: s.segmentType,
              physicalCableLabel: s.physicalCableLabel ?? null,
              physicalCableLength: s.physicalCableLength ?? null,
              notes: s.notes ?? null,
            })),
          },
        },
        include: { segments: { orderBy: { sequence: 'asc' } } },
      });

      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: 'CablePath',
          entityId: created.id,
          action: 'cable_path.created',
          diff: { pathRole: dto.pathRole, segmentCount: dto.segments.length },
          serviceId,
          occurredAt: new Date(),
        },
      });

      return created;
    });

    // Reserve all ports using the concurrency-safe service (SELECT FOR UPDATE,
    // Serializable isolation). If this throws the path record must be cleaned up.
    try {
      await this.portReservations.reserveBatch(
        allPortIds.map((portId) => ({
          portId,
          serviceId,
          cablePathId: path.id,
          reservedById: actorId,
        })),
      );
    } catch (err) {
      // Compensating delete — the planned path has no reserved ports yet so
      // it is safe to remove it without leaving orphaned reservations.
      await this.prisma.cablePath.delete({ where: { id: path.id } }).catch(() => null);
      throw err;
    }

    return path;
  }

  // Mark path as installed (technician has completed physical work, pending test)
  async markInstalled(pathId: string, dto: MarkInstalledDto, actorId: string, actorRole?: string) {
    const path = await this.prisma.cablePath.findUniqueOrThrow({
      where: { id: pathId },
      include: { segments: { select: { id: true, physicalCableLabel: true } } },
    });

    const guardEntity: PathGuardEntity = {
      id: path.id,
      state: path.state as PathState,
      pathRole: path.pathRole,
      serviceId: path.serviceId,
      segmentCount: path.segments.length,
      allSegmentsHaveCableLabel: path.segments.every((s) => Boolean(s.physicalCableLabel)),
    };

    try {
      pathMachine.transition(path.state as PathState, 'installed', {
        actorId,
        actorRole,
        entity: guardEntity,
      });
    } catch (err) {
      toHttpException(err);
    }

    const installedAt = dto.installedAt ? new Date(dto.installedAt) : new Date();

    const updated = await this.prisma.cablePath.update({
      where: { id: pathId },
      data: { state: 'installed', installedAt, installedById: actorId },
    });

    await this.audit.log({
      actorId,
      entityType: 'CablePath',
      entityId: pathId,
      action: 'cable_path.installed',
      serviceId: path.serviceId,
    });

    return updated;
  }

  // Activate path: installed → active, ports reserved → in_use, service → active
  async activatePath(pathId: string, actorId: string, actorRole?: string) {
    const path = await this.prisma.cablePath.findUniqueOrThrow({
      where: { id: pathId },
      include: { service: true, segments: { select: { id: true, physicalCableLabel: true } } },
    });

    const guardEntity: PathGuardEntity = {
      id: path.id,
      state: path.state as PathState,
      pathRole: path.pathRole,
      serviceId: path.serviceId,
      segmentCount: path.segments.length,
      allSegmentsHaveCableLabel: path.segments.every((s) => Boolean(s.physicalCableLabel)),
    };

    try {
      pathMachine.transition(path.state as PathState, 'active', {
        actorId,
        actorRole,
        entity: guardEntity,
      });
    } catch (err) {
      toHttpException(err);
    }

    // Transition reserved ports → in_use using the concurrency-safe service
    await this.portReservations.activatePorts(pathId);

    return this.prisma.$transaction(async (tx) => {
      await tx.cablePath.update({ where: { id: pathId }, data: { state: 'active' } });

      // Activate service if not already active
      if (path.service.state === 'provisioning') {
        await tx.crossConnectService.update({
          where: { id: path.serviceId },
          data: { state: 'active', activatedAt: new Date() },
        });
        // Emit billing trigger
        await tx.billingTriggerEvent.create({
          data: {
            serviceId: path.serviceId,
            eventType: 'service_activated',
            occurredAt: new Date(),
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: 'CablePath',
          entityId: pathId,
          action: 'cable_path.activated',
          serviceId: path.serviceId,
          occurredAt: new Date(),
        },
      });

      return tx.cablePath.findUniqueOrThrow({ where: { id: pathId } });
    });
  }

  // Initiate reroute: active → rerouting (a new planned path for the same role must exist first)
  async initiateReroute(pathId: string, actorId: string, actorRole?: string) {
    const path = await this.prisma.cablePath.findUniqueOrThrow({
      where: { id: pathId },
      include: { segments: { select: { id: true, physicalCableLabel: true } } },
    });

    // Precondition: a planned replacement path for same service + pathRole must already exist
    const replacement = await this.prisma.cablePath.findFirst({
      where: { serviceId: path.serviceId, pathRole: path.pathRole, state: 'planned', id: { not: pathId } },
    });
    if (!replacement) {
      throw new BadRequestException(
        `A planned replacement path for role '${path.pathRole}' must exist before initiating a reroute`,
      );
    }

    const guardEntity: PathGuardEntity = {
      id: path.id,
      state: path.state as PathState,
      pathRole: path.pathRole,
      serviceId: path.serviceId,
      segmentCount: path.segments.length,
      allSegmentsHaveCableLabel: path.segments.every((s) => Boolean(s.physicalCableLabel)),
    };

    try {
      pathMachine.transition(path.state as PathState, 'rerouting', { actorId, actorRole, entity: guardEntity });
    } catch (err) {
      toHttpException(err);
    }

    await this.prisma.cablePath.update({ where: { id: pathId }, data: { state: 'rerouting' } });

    await this.audit.log({
      actorId,
      entityType: 'CablePath',
      entityId: pathId,
      action: 'cable_path.rerouting_initiated',
      serviceId: path.serviceId,
    });
  }

  // Decommission a path: release ports back to available
  async decommissionPath(pathId: string, actorId: string, actorRole?: string) {
    const path = await this.prisma.cablePath.findUniqueOrThrow({
      where: { id: pathId },
      include: { segments: { select: { id: true, physicalCableLabel: true } } },
    });

    const guardEntity: PathGuardEntity = {
      id: path.id,
      state: path.state as PathState,
      pathRole: path.pathRole,
      serviceId: path.serviceId,
      segmentCount: path.segments.length,
      allSegmentsHaveCableLabel: path.segments.every((s) => Boolean(s.physicalCableLabel)),
    };

    try {
      pathMachine.transition(path.state as PathState, 'decommissioned', {
        actorId,
        actorRole,
        entity: guardEntity,
      });
    } catch (err) {
      toHttpException(err);
    }

    // Mark path state first, then release ports via the concurrency-safe service
    await this.prisma.cablePath.update({
      where: { id: pathId },
      data: { state: 'decommissioned' },
    });

    await this.portReservations.releasePorts({
      cablePathId: pathId,
      releaseReason: 'cable path decommissioned',
      releasedById: actorId,
      outcome: 'released',
    });

    await this.audit.log({
      actorId,
      entityType: 'CablePath',
      entityId: pathId,
      action: 'cable_path.decommissioned',
      serviceId: path.serviceId,
    });
  }
}
