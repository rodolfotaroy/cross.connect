import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { buildPaginatedMeta } from '../../common/pagination/paginate';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type {
    AssignWorkOrderDto,
    CancelWorkOrderDto,
    CompleteWorkOrderDto,
    CreateWorkOrderDto,
    ListWorkOrdersDto,
    ProgressWorkOrderDto,
} from './dto/work-order.dto';

function generateWoNumber(): string {
  const year = new Date().getFullYear();
  const rand = randomInt(10000, 100000);
  return `WO-${year}-${rand}`;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listWorkOrders(user: AuthenticatedUser, query: ListWorkOrdersDto) {
    const { page, limit, sortBy, sortDir, state, woType, serviceId, assignedToId, priority, q } =
      query;

    const where: Record<string, unknown> = {};
    if (state) where['state'] = state;
    if (woType) where['woType'] = woType;
    if (serviceId) where['serviceId'] = serviceId;
    if (assignedToId) where['assignedToId'] = assignedToId;
    if (priority !== undefined) where['priority'] = priority;
    if (q) where['woNumber'] = { contains: q, mode: 'insensitive' };
    // Technicians see only their own WOs
    if (user.role === 'ops_technician') where['assignedToId'] = user.id;

    const orderBy = { [sortBy ?? 'createdAt']: sortDir ?? 'desc' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          service: { select: { id: true, serviceNumber: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);
    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }

  async getWorkOrder(id: string) {
    return this.prisma.workOrder.findUniqueOrThrow({
      where: { id },
      include: {
        service: true,
        cablePath: {
          include: {
            segments: {
              include: {
                fromPort: { select: { id: true, label: true } },
                toPort: { select: { id: true, label: true } },
              },
            },
          },
        },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        documents: true,
        auditEvents: {
          include: { actor: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { occurredAt: 'desc' },
        },
      },
    });
  }

  async createWorkOrder(dto: CreateWorkOrderDto, actorId: string) {
    await this.prisma.crossConnectService.findUniqueOrThrow({ where: { id: dto.serviceId } });

    const wo = await this.prisma.workOrder.create({
      data: {
        woNumber: generateWoNumber(),
        serviceId: dto.serviceId,
        cablePathId: dto.cablePathId ?? null,
        woType: dto.woType,
        state: 'created',
        priority: dto.priority ?? 3,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        dueBy: dto.dueBy ? new Date(dto.dueBy) : null,
      },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: wo.id,
      action: 'workorder.created',
      serviceId: dto.serviceId,
      workOrderId: wo.id,
    });

    return wo;
  }

  async assign(id: string, dto: AssignWorkOrderDto, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });

    if (!['created', 'assigned'].includes(wo.state)) {
      throw new BadRequestException(`Work order in state '${wo.state}' cannot be assigned`);
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        state: 'assigned',
        assignedToId: dto.assignedToId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : wo.scheduledAt,
      },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'workorder.assigned',
      diff: { assignedToId: dto.assignedToId },
      workOrderId: id,
      serviceId: wo.serviceId,
    });

    return updated;
  }

  async startWork(id: string, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });
    if (wo.state !== 'assigned') {
      throw new BadRequestException(
        `Work order must be assigned before starting (current: ${wo.state})`,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { state: 'in_progress' },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'workorder.started',
      workOrderId: id,
      serviceId: wo.serviceId,
    });

    return updated;
  }

  async pendingTest(id: string, dto: ProgressWorkOrderDto, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });
    if (wo.state !== 'in_progress') {
      throw new BadRequestException(
        `Work order must be in_progress to mark pending_test (current: ${wo.state})`,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { state: 'pending_test', techNotes: dto.techNotes },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'workorder.pending_test',
      workOrderId: id,
      serviceId: wo.serviceId,
    });

    return updated;
  }

  async testFailed(id: string, dto: ProgressWorkOrderDto, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });
    if (wo.state !== 'pending_test') {
      throw new BadRequestException(
        `Work order must be pending_test to record test failure (current: ${wo.state})`,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { state: 'in_progress', techNotes: dto.techNotes },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'workorder.test_failed',
      diff: { failureReason: dto.failureReason, techNotes: dto.techNotes },
      workOrderId: id,
      serviceId: wo.serviceId,
    });

    return updated;
  }

  async complete(id: string, dto: CompleteWorkOrderDto, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });

    // Work orders must pass through pending_test before being completed — skipping
    // the test phase is not allowed regardless of work order type.
    if (wo.state !== 'pending_test') {
      throw new BadRequestException(
        `Work order must be in 'pending_test' state to complete (current: ${wo.state}). ` +
          `Use PATCH /:id/pending-test first.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workOrder.update({
        where: { id },
        data: { state: 'completed', completedAt: new Date(), techNotes: dto.techNotes },
      });

      // ── Install WO side effects ─────────────────────────────────────────────
      // Completing an install work order activates the associated service (if still
      // provisioning) and emits the billing trigger event.
      if (wo.woType === 'install') {
        const service = await tx.crossConnectService.findUnique({
          where: { id: wo.serviceId },
          select: { id: true, state: true },
        });
        if (service && service.state === 'provisioning') {
          await tx.crossConnectService.update({
            where: { id: wo.serviceId },
            data: { state: 'active', activatedAt: new Date() },
          });
          await tx.billingTriggerEvent.create({
            data: {
              serviceId: wo.serviceId,
              eventType: 'service_activated',
              occurredAt: new Date(),
            },
          });
        }
      }

      // ── Disconnect WO side effects ──────────────────────────────────────────
      // Completing a disconnect work order moves the service to disconnected and
      // emits the billing trigger event so MRC billing stops.
      if (wo.woType === 'disconnect') {
        const service = await tx.crossConnectService.findUnique({
          where: { id: wo.serviceId },
          select: { id: true, state: true },
        });
        if (service && service.state === 'pending_disconnect') {
          await tx.crossConnectService.update({
            where: { id: wo.serviceId },
            data: { state: 'disconnected', disconnectedAt: new Date() },
          });
          await tx.billingTriggerEvent.create({
            data: {
              serviceId: wo.serviceId,
              eventType: 'service_disconnected',
              occurredAt: new Date(),
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: 'WorkOrder',
          entityId: id,
          action: 'workorder.completed',
          diff: { techNotes: dto.techNotes, woType: wo.woType },
          workOrderId: id,
          serviceId: wo.serviceId,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }

  async cancel(id: string, dto: CancelWorkOrderDto, actorId: string) {
    const wo = await this.prisma.workOrder.findUniqueOrThrow({ where: { id } });

    if (['completed', 'cancelled'].includes(wo.state)) {
      throw new BadRequestException(`Work order cannot be cancelled from state '${wo.state}'`);
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { state: 'cancelled' },
    });

    await this.audit.log({
      actorId,
      entityType: 'WorkOrder',
      entityId: id,
      action: 'workorder.cancelled',
      diff: { reason: dto.cancellationReason },
      workOrderId: id,
      serviceId: wo.serviceId,
    });

    return updated;
  }
}
