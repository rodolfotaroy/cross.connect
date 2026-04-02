import { Injectable } from '@nestjs/common';
import { buildPaginatedMeta } from '../../common/pagination/paginate';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface AuditLogInput {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  diff?: Record<string, unknown>;
  ipAddress?: string;
  orderId?: string;
  serviceId?: string;
  workOrderId?: string;
}

export interface ListAuditInput {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  actorId?: string;
  orderId?: string;
  serviceId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditEvent.create({
      data: {
        actorId: input.actorId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        diff: input.diff ? (input.diff as any) : undefined,
        ipAddress: input.ipAddress,
        orderId: input.orderId,
        serviceId: input.serviceId,
        workOrderId: input.workOrderId,
        occurredAt: new Date(),
      },
    });
  }

  async listForEntity(entityType: string, entityId: string) {
    return this.prisma.auditEvent.findMany({
      where: { entityType, entityId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async listForOrder(orderId: string) {
    return this.prisma.auditEvent.findMany({
      where: { orderId },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async listPaginated(query: ListAuditInput) {
    const {
      page = 1,
      limit = 50,
      entityType,
      action,
      actorId,
      orderId,
      serviceId,
      from,
      to,
    } = query;
    const where: Record<string, unknown> = {};
    if (entityType) where['entityType'] = entityType;
    if (action) where['action'] = { contains: action, mode: 'insensitive' };
    if (actorId) where['actorId'] = actorId;
    if (orderId) where['orderId'] = orderId;
    if (serviceId) where['serviceId'] = serviceId;
    if (from || to) {
      where['occurredAt'] = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: Math.min(limit, 200),
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }
}
