import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import type {
    DisconnectServiceInput,
    ExtendTemporaryServiceInput,
    ListServicesInput,
    ServiceState,
    SuspendServiceInput,
} from '@xc/types';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
    InsufficientRoleError,
    InvalidTransitionError,
    TransitionGuardError,
} from '../../common/errors/domain.errors';
import { buildPaginatedMeta } from '../../common/pagination/paginate';
import { StateMachine } from '../../common/state-machine/state-machine';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PortReservationService } from '../reservations/port-reservation.service';
import { type ServiceGuardEntity, SERVICE_TRANSITIONS } from './service.lifecycle';

const serviceMachine = new StateMachine<ServiceState, ServiceGuardEntity>(SERVICE_TRANSITIONS);

function toHttpException(err: unknown): never {
  if (err instanceof InvalidTransitionError) {
    throw new BadRequestException(err.message);
  }
  if (err instanceof InsufficientRoleError) {
    throw new ForbiddenException(err.message);
  }
  if (err instanceof TransitionGuardError) {
    throw new UnprocessableEntityException(err.message);
  }
  throw err;
}

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly portReservations: PortReservationService,
  ) {}

  async listServices(query: ListServicesInput, user: AuthenticatedUser) {
    const { page, limit, sortBy, sortDir, state, serviceType, orgId, isTemporary, q } = query;
    const where: Record<string, unknown> = {};
    if (state) where['state'] = state;
    if (serviceType) where['serviceType'] = serviceType;
    if (isTemporary !== undefined) where['isTemporary'] = isTemporary;
    if (q) where['serviceNumber'] = { contains: q, mode: 'insensitive' };
    if (!['super_admin', 'ops_manager', 'ops_technician'].includes(user.role)) {
      where['order'] = { requestingOrgId: user.orgId };
    } else if (orgId) {
      where['order'] = { requestingOrgId: orgId };
    }
    const orderBy = { [sortBy ?? 'createdAt']: sortDir ?? 'desc' };
    const skip = (page - 1) * limit;
    const [raw, total] = await Promise.all([
      this.prisma.crossConnectService.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          order: { select: { requestingOrg: { select: { id: true, name: true, code: true } } } },
          endpoints: { include: { organization: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.crossConnectService.count({ where }),
    ]);
    const data = raw.map((svc) => ({
      ...svc,
      endpoints: svc.endpoints.map((ep) => ({
        ...ep,
        endpointSide: ep.side,
        organizationName: ep.organization?.name ?? null,
      })),
    }));
    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }

  async getService(id: string, user: AuthenticatedUser) {
    const service = await this.prisma.crossConnectService.findUniqueOrThrow({
      where: { id },
      include: {
        order: {
          include: {
            requestingOrg: { select: { id: true, name: true, code: true } },
            endpoints: {
              include: { organization: { select: { id: true, name: true } }, demarcPoint: true },
            },
          },
        },
        endpoints: {
          include: {
            organization: { select: { id: true, name: true } },
            assignedPanel: { select: { id: true, code: true, name: true } },
          },
        },
        cablePaths: {
          include: {
            segments: {
              include: {
                fromPort: {
                  include: {
                    panel: {
                      include: {
                        rack: {
                          include: {
                            room: { include: { building: { include: { site: true } } } },
                            cage: { include: { room: { include: { building: { include: { site: true } } } } } },
                          },
                        },
                        room: { include: { building: { include: { site: true } } } },
                      },
                    },
                  },
                },
                toPort: {
                  include: {
                    panel: {
                      include: {
                        rack: {
                          include: {
                            room: { include: { building: { include: { site: true } } } },
                            cage: { include: { room: { include: { building: { include: { site: true } } } } } },
                          },
                        },
                        room: { include: { building: { include: { site: true } } } },
                      },
                    },
                  },
                },
              },
              orderBy: { sequence: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const isOperator = ['super_admin', 'ops_manager', 'ops_technician'].includes(user.role);
    if (!isOperator && (service as any).order.requestingOrgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return {
      ...service,
      endpoints: service.endpoints.map((ep) => ({
        ...ep,
        endpointSide: ep.side,
        organizationName: ep.organization?.name ?? null,
      })),
    };
  }

  private async buildGuardEntity(serviceId: string): Promise<ServiceGuardEntity> {
    const [service, activeWoCount, activeCablePathCount] = await Promise.all([
      this.prisma.crossConnectService.findUniqueOrThrow({ where: { id: serviceId } }),
      this.prisma.workOrder.count({
        where: { serviceId, state: { in: ['assigned', 'in_progress', 'pending_test'] } },
      }),
      this.prisma.cablePath.count({ where: { serviceId, state: 'active' } }),
    ]);
    return {
      id: service.id,
      state: service.state as ServiceState,
      isTemporary: service.isTemporary,
      expiresAt: service.expiresAt,
      hasActiveInstallWorkOrder: activeWoCount > 0,
      hasActiveCablePath: activeCablePathCount > 0,
    };
  }

  async disconnect(id: string, dto: DisconnectServiceInput, user: AuthenticatedUser) {
    const entity = await this.buildGuardEntity(id);
    try {
      await serviceMachine.transition(entity.state, 'pending_disconnect', {
        entity,
        actorId: user.id,
        actorRole: user.role,
        payload: { reason: dto.reason },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectService.update({
        where: { id },
        data: {
          state: 'pending_disconnect',
          disconnectRequestedAt: new Date(),
          disconnectReason: dto.reason,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectService',
          entityId: id,
          action: 'service.disconnect_requested',
          diff: {
            before: { state: entity.state },
            after: { state: 'pending_disconnect' },
            reason: dto.reason,
          },
          serviceId: id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
  }

  async abortProvisioning(id: string, dto: { reason: string }, user: AuthenticatedUser) {
    const entity = await this.buildGuardEntity(id);
    try {
      await serviceMachine.transition(entity.state, 'disconnected', {
        entity,
        actorId: user.id,
        actorRole: user.role,
        payload: { reason: dto.reason },
      });
    } catch (err) {
      toHttpException(err);
    }

    // Release any ports reserved by planned cable paths before marking the
    // service as disconnected. Without this, ports remain reserved indefinitely.
    const plannedPaths = await this.prisma.cablePath.findMany({
      where: { serviceId: id, state: { not: 'decommissioned' } },
      select: { id: true },
    });
    for (const path of plannedPaths) {
      await this.prisma.cablePath.update({
        where: { id: path.id },
        data: { state: 'decommissioned' },
      });
      await this.portReservations.releasePorts({
        cablePathId: path.id,
        releaseReason: `provisioning aborted: ${dto.reason}`,
        releasedById: user.id,
        outcome: 'cancelled',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectService.update({
        where: { id },
        data: { state: 'disconnected', disconnectedAt: new Date(), disconnectReason: dto.reason },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectService',
          entityId: id,
          action: 'service.provisioning_aborted',
          diff: {
            before: { state: 'provisioning' },
            after: { state: 'disconnected' },
            reason: dto.reason,
          },
          serviceId: id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
  }

  async suspend(id: string, dto: SuspendServiceInput, user: AuthenticatedUser) {
    const entity = await this.buildGuardEntity(id);
    try {
      await serviceMachine.transition(entity.state, 'suspended', {
        entity,
        actorId: user.id,
        actorRole: user.role,
        payload: { reason: dto.reason },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectService.update({
        where: { id },
        data: { state: 'suspended', suspendedAt: new Date(), suspendedReason: dto.reason },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectService',
          entityId: id,
          action: 'service.suspended',
          diff: { before: { state: 'active' }, after: { state: 'suspended' }, reason: dto.reason },
          serviceId: id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
  }

  async resume(id: string, user: AuthenticatedUser) {
    const entity = await this.buildGuardEntity(id);
    try {
      await serviceMachine.transition(entity.state, 'active', {
        entity,
        actorId: user.id,
        actorRole: user.role,
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectService.update({
        where: { id },
        data: { state: 'active', suspendedAt: null, suspendedReason: null },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectService',
          entityId: id,
          action: 'service.resumed',
          diff: { before: { state: 'suspended' }, after: { state: 'active' } },
          serviceId: id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
  }

  async extend(id: string, dto: ExtendTemporaryServiceInput, user: AuthenticatedUser) {
    const service = await this.prisma.crossConnectService.findUniqueOrThrow({ where: { id } });
    if (!service.isTemporary)
      throw new BadRequestException('Cannot extend a permanent cross-connect service');
    const terminal: string[] = ['disconnected', 'pending_disconnect'];
    if (terminal.includes(service.state))
      throw new BadRequestException(`Cannot extend service in state '${service.state}'`);
    const newExpiresAt = new Date(dto.newExpiresAt);
    if (service.expiresAt && newExpiresAt <= service.expiresAt) {
      throw new BadRequestException(
        'New expiry date must be strictly later than the current expiry date',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectService.update({
        where: { id },
        data: { expiresAt: newExpiresAt },
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectService',
          entityId: id,
          action: 'service.expiry_extended',
          diff: {
            before: { expiresAt: service.expiresAt?.toISOString() ?? null },
            after: { expiresAt: newExpiresAt.toISOString() },
            reason: dto.reason ?? null,
          },
          serviceId: id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
  }
}
