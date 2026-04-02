import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import type { ListAvailablePortsInput, PortState } from '@xc/types';
import {
    InsufficientRoleError,
    InvalidTransitionError,
    TransitionGuardError,
} from '../../common/errors/domain.errors';
import { StateMachine } from '../../common/state-machine/state-machine';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { type PortGuardEntity, PORT_TRANSITIONS } from './port.lifecycle';

const portMachine = new StateMachine<PortState, PortGuardEntity>(PORT_TRANSITIONS);

function toHttpException(err: unknown): never {
  if (err instanceof InvalidTransitionError) throw new BadRequestException(err.message);
  if (err instanceof InsufficientRoleError) throw new ForbiddenException(err.message);
  if (err instanceof TransitionGuardError) throw new UnprocessableEntityException(err.message);
  throw err;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getPortAvailability(panelId: string) {
    const counts = await this.prisma.port.groupBy({
      by: ['state'],
      where: { panelId },
      _count: { state: true },
    });

    const total = await this.prisma.port.count({ where: { panelId } });
    const map = Object.fromEntries(counts.map((r) => [r.state, r._count.state]));

    return {
      panelId,
      total,
      available: map['available'] ?? 0,
      reserved: map['reserved'] ?? 0,
      inUse: map['in_use'] ?? 0,
      faulty: map['faulty'] ?? 0,
      maintenance: map['maintenance'] ?? 0,
      decommissioned: map['decommissioned'] ?? 0,
    };
  }

  async listPanelPorts(panelId: string, query: ListAvailablePortsInput) {
    const where: Record<string, unknown> = { panelId };
    if (query.mediaType) where['mediaType'] = query.mediaType;
    if (query.connectorType) where['connectorType'] = query.connectorType;
    if (query.strandRole) where['strandRole'] = query.strandRole;
    return this.prisma.port.findMany({ where, orderBy: { position: 'asc' } });
  }

  async listAvailablePorts(panelId: string, query: ListAvailablePortsInput) {
    const where: Record<string, unknown> = { panelId, state: 'available' };
    if (query.mediaType) where['mediaType'] = query.mediaType;
    if (query.connectorType) where['connectorType'] = query.connectorType;
    if (query.strandRole) where['strandRole'] = query.strandRole;
    return this.prisma.port.findMany({ where, orderBy: { position: 'asc' } });
  }

  async transitionPortState(
    portId: string,
    toState: PortState,
    actorId: string,
    actorRole?: string,
    reason?: string,
  ) {
    const port = await this.prisma.port.findUniqueOrThrow({ where: { id: portId } });

    try {
      portMachine.transition(port.state as PortState, toState, {
        actorId,
        actorRole,
        entity: { id: port.id, state: port.state as PortState, panelId: port.panelId },
      });
    } catch (err) {
      toHttpException(err);
    }

    const updated = await this.prisma.port.update({
      where: { id: portId },
      data: { state: toState },
    });

    await this.audit.log({
      actorId,
      entityType: 'Port',
      entityId: portId,
      action: 'port.state_changed',
      diff: { before: { state: port.state }, after: { state: toState }, reason },
    });

    return updated;
  }

  // Transactionally reserve a set of ports for a cable path plan.
  // All ports must be 'available' or the entire operation is rejected.
  async reservePorts(portIds: string[], actorId: string, cablePathId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ports = await tx.port.findMany({ where: { id: { in: portIds } } });

      const notAvailable = ports.filter((p) => p.state !== 'available');
      if (notAvailable.length > 0) {
        throw new BadRequestException(
          `Ports not available: ${notAvailable.map((p) => `${p.label} (${p.state})`).join(', ')}`,
        );
      }

      await tx.port.updateMany({
        where: { id: { in: portIds } },
        data: { state: 'reserved' },
      });

      // Audit each port reservation
      await tx.auditEvent.createMany({
        data: portIds.map((portId) => ({
          actorId,
          entityType: 'Port',
          entityId: portId,
          action: 'port.reserved',
          diff: { cablePathId },
          occurredAt: new Date(),
        })),
      });

      return { reserved: portIds.length };
    });
  }

  // Release reserved ports back to available (e.g., path cancelled)
  async releasePorts(portIds: string[], actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.port.updateMany({
        where: { id: { in: portIds }, state: 'reserved' },
        data: { state: 'available' },
      });

      await tx.auditEvent.createMany({
        data: portIds.map((portId) => ({
          actorId,
          entityType: 'Port',
          entityId: portId,
          action: 'port.released',
          occurredAt: new Date(),
        })),
      });

      return { released: portIds.length };
    });
  }

  // Activate ports (reserved → in_use) when a cable path goes active
  async activatePorts(portIds: string[], actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.port.updateMany({
        where: { id: { in: portIds }, state: 'reserved' },
        data: { state: 'in_use' },
      });

      await tx.auditEvent.createMany({
        data: portIds.map((portId) => ({
          actorId,
          entityType: 'Port',
          entityId: portId,
          action: 'port.activated',
          occurredAt: new Date(),
        })),
      });

      return { activated: portIds.length };
    });
  }

  async listRackPanels(rackId: string) {
    const panels = await this.prisma.panel.findMany({
      where: { rackId },
      include: {
        _count: { select: { ports: true } },
      },
      orderBy: { uPosition: 'asc' },
    });

    // Attach availability counts
    const panelIds = panels.map((p) => p.id);
    const available = await this.prisma.port.groupBy({
      by: ['panelId'],
      where: { panelId: { in: panelIds }, state: 'available' },
      _count: { panelId: true },
    });
    const availableMap = Object.fromEntries(available.map((a) => [a.panelId, a._count.panelId]));

    return panels.map((p) => ({
      ...p,
      availablePorts: availableMap[p.id] ?? 0,
      totalPorts: p._count.ports,
    }));
  }

  async listRoomPanels(roomId: string) {
    return this.prisma.panel.findMany({
      where: { roomId },
      include: {
        _count: { select: { ports: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getSitePortAvailability(siteId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { building: { siteId } },
      select: { id: true, name: true, code: true, roomType: true },
      orderBy: { code: 'asc' },
    });

    const roomRows = await Promise.all(
      rooms.map(async (room) => {
        const portOR = [
          { panel: { roomId: room.id } },
          { panel: { rack: { roomId: room.id } } },
          { panel: { rack: { cage: { roomId: room.id } } } },
        ];
        const [total, available, reserved, inUse] = await Promise.all([
          this.prisma.port.count({ where: { OR: portOR } }),
          this.prisma.port.count({ where: { state: 'available', OR: portOR } }),
          this.prisma.port.count({ where: { state: 'reserved', OR: portOR } }),
          this.prisma.port.count({ where: { state: 'in_use', OR: portOR } }),
        ]);
        return {
          roomId: room.id,
          roomName: room.name,
          roomCode: room.code,
          roomType: room.roomType,
          total,
          available,
          reserved,
          inUse,
        };
      }),
    );

    return { siteId, rooms: roomRows };
  }

  async listAllPanelsInRoom(roomId: string) {
    return this.prisma.panel.findMany({
      where: {
        OR: [
          { roomId },
          { rack: { roomId } },
          { rack: { cage: { roomId } } },
        ],
      },
      include: { _count: { select: { ports: true } } },
      orderBy: { code: 'asc' },
    });
  }
}
