import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnprocessableEntityException,
} from '@nestjs/common';
import type { OrderState } from '@xc/types';
import { randomInt } from 'node:crypto';
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
import type {
    ApproveOrderDto,
    CancelOrderDto,
    ConfirmFeasibilityDto,
    CreateOrderDto,
    ListOrdersDto,
    RejectOrderDto,
} from './dto/order.dto';
import { type OrderGuardEntity, ORDER_TRANSITIONS } from './order.lifecycle';

const orderMachine = new StateMachine<OrderState, OrderGuardEntity>(ORDER_TRANSITIONS);

function toHttpException(err: unknown): never {
  if (err instanceof InvalidTransitionError) throw new BadRequestException(err.message);
  if (err instanceof InsufficientRoleError) throw new ForbiddenException(err.message);
  if (err instanceof TransitionGuardError) throw new UnprocessableEntityException(err.message);
  throw err;
}

function generateOrderNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = randomInt(10000, 100000);
  return `${prefix}-${year}-${rand}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOrders(user: AuthenticatedUser, query: ListOrdersDto) {
    const { page, limit, sortBy, sortDir, state, serviceType, mediaType, orgId, isTemporary, q } =
      query;
    const isOperator = ['super_admin', 'ops_manager', 'ops_technician'].includes(user.role);

    const where: Record<string, unknown> = {};
    if (!isOperator) where['requestingOrgId'] = user.orgId;
    else if (orgId) where['requestingOrgId'] = orgId;
    if (state) where['state'] = state;
    if (serviceType) where['serviceType'] = serviceType;
    if (mediaType) where['mediaType'] = mediaType;
    if (isTemporary !== undefined) where['isTemporary'] = isTemporary;
    if (q)
      where['OR'] = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerReference: { contains: q, mode: 'insensitive' } },
      ];

    const orderBy = { [sortBy ?? 'createdAt']: sortDir ?? 'desc' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.crossConnectOrder.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          requestingOrg: { select: { id: true, name: true, code: true } },
          submittedBy: { select: { id: true, firstName: true, lastName: true } },
          service: { select: { id: true, serviceNumber: true, state: true } },
        },
      }),
      this.prisma.crossConnectOrder.count({ where }),
    ]);
    const mapped = data.map((o) => ({
      ...o,
      requestingOrgName: (o as any).requestingOrg?.name ?? null,
    }));
    return { data: mapped, meta: buildPaginatedMeta(total, page, limit) };
  }

  async getOrder(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({
      where: { id },
      include: {
        requestingOrg: true,
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        endpoints: {
          include: {
            organization: { select: { id: true, name: true } },
            demarcPoint: true,
          },
        },
        service: {
          include: {
            cablePaths: { include: { segments: true } },
          },
        },
        documents: true,
      },
    });

    const isOperator = ['super_admin', 'ops_manager', 'ops_technician'].includes(user.role);
    if (!isOperator && order.requestingOrgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return {
      ...order,
      requestingOrgName: (order as any).requestingOrg?.name ?? null,
    };
  }

  async createOrder(dto: CreateOrderDto, user: AuthenticatedUser) {
    const orderNumber = generateOrderNumber('XCO');

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.crossConnectOrder.create({
        data: {
          orderNumber,
          requestingOrgId: user.orgId,
          submittedById: user.id,
          serviceType: dto.serviceType,
          mediaType: dto.mediaType,
          speedGbps: dto.speedGbps ?? null,
          isTemporary: dto.isTemporary,
          requestedActiveAt: dto.requestedActiveAt ? new Date(dto.requestedActiveAt) : null,
          requestedExpiresAt: dto.requestedExpiresAt ? new Date(dto.requestedExpiresAt) : null,
          customerReference: dto.customerReference ?? null,
          notes: dto.notes ?? null,
          state: 'draft',
        },
      });

      // Create A-side and Z-side endpoint intent records
      await tx.orderEndpoint.createMany({
        data: [
          { orderId: order.id, side: 'a_side', ...dto.aSide },
          { orderId: order.id, side: 'z_side', ...dto.zSide },
        ],
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: order.id,
          action: 'order.created',
          orderId: order.id,
          occurredAt: new Date(),
        },
      });

      return order;
    });
  }

  async submitOrder(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({
      where: { id },
      include: { endpoints: { select: { side: true, loaNumber: true, endpointType: true } } },
    });

    const isOperator = ['super_admin', 'ops_manager'].includes(user.role);
    if (!isOperator && order.requestingOrgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    const guardEntity: OrderGuardEntity = {
      id: order.id,
      state: order.state as OrderState,
      submittedById: order.submittedById,
      requestingOrgId: order.requestingOrgId,
      endpoints: order.endpoints,
    };

    try {
      orderMachine.transition(order.state as OrderState, 'submitted', {
        actorId: user.id,
        actorRole: user.role,
        entity: guardEntity,
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: { state: 'submitted', submittedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.submitted',
          diff: { before: { state: 'draft' }, after: { state: 'submitted' } },
          orderId: id,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }

  async reviewOrder(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({ where: { id } });

    try {
      orderMachine.transition(order.state as OrderState, 'under_review', {
        actorId: user.id,
        actorRole: user.role,
        entity: {
          id: order.id,
          state: order.state as OrderState,
          submittedById: order.submittedById,
          requestingOrgId: order.requestingOrgId,
          endpoints: [],
        },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: { state: 'under_review' },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.under_review',
          diff: { before: { state: 'submitted' }, after: { state: 'under_review' } },
          orderId: id,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }

  async confirmFeasibility(id: string, dto: ConfirmFeasibilityDto, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({ where: { id } });

    try {
      orderMachine.transition(order.state as OrderState, 'pending_approval', {
        actorId: user.id,
        actorRole: user.role,
        entity: {
          id: order.id,
          state: order.state as OrderState,
          submittedById: order.submittedById,
          requestingOrgId: order.requestingOrgId,
          endpoints: [],
        },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: { state: 'pending_approval' },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.feasibility_confirmed',
          diff: {
            before: { state: 'under_review' },
            after: { state: 'pending_approval' },
            notes: dto.notes,
          },
          orderId: id,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }

  async approveOrder(id: string, dto: ApproveOrderDto, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({ where: { id } });

    try {
      orderMachine.transition(order.state as OrderState, 'approved', {
        actorId: user.id,
        actorRole: user.role,
        entity: {
          id: order.id,
          state: order.state as OrderState,
          submittedById: order.submittedById,
          requestingOrgId: order.requestingOrgId,
          endpoints: [],
        },
      });
    } catch (err) {
      toHttpException(err);
    }

    const serviceNumber = generateOrderNumber('XC');
    const woNumber = generateOrderNumber('WO');

    // Fetch endpoints before transaction — they are immutable after submission
    const orderEndpoints = await this.prisma.orderEndpoint.findMany({ where: { orderId: id } });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: { state: 'approved', approvedById: user.id, approvedAt: new Date() },
      });

      // Create the provisioning service record — billing anchor for the lifecycle
      const service = await tx.crossConnectService.create({
        data: {
          serviceNumber,
          orderId: id,
          state: 'provisioning',
          serviceType: order.serviceType,
          mediaType: order.mediaType,
          speedGbps: order.speedGbps,
          isTemporary: order.isTemporary,
          expiresAt: order.requestedExpiresAt,
        },
      });

      // Seed service endpoints from the immutable order endpoints so ops staff
      // can see the desired A/Z topology immediately after approval.
      if (orderEndpoints.length > 0) {
        await tx.serviceEndpoint.createMany({
          data: orderEndpoints.map((ep) => ({
            serviceId: service.id,
            side: ep.side,
            endpointType: ep.endpointType,
            organizationId: ep.organizationId ?? null,
            demarcPointId: ep.demarcPointId ?? null,
            assignedPanelId: null,
          })),
        });
      }

      // Auto-create the install work order. Must happen atomically with service creation
      // so technicians can immediately see the job in their queue.
      const workOrder = await tx.workOrder.create({
        data: {
          woNumber,
          serviceId: service.id,
          woType: 'install',
          state: 'created',
          priority: 3,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.approved',
          diff: {
            serviceId: service.id,
            serviceNumber,
            workOrderId: workOrder.id,
            woNumber,
            notes: dto.notes,
          },
          orderId: id,
          serviceId: service.id,
          workOrderId: workOrder.id,
          occurredAt: new Date(),
        },
      });

      return { order: updated, service, workOrder };
    });
  }

  async rejectOrder(id: string, dto: RejectOrderDto, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({ where: { id } });

    try {
      orderMachine.transition(order.state as OrderState, 'rejected', {
        actorId: user.id,
        actorRole: user.role,
        entity: {
          id: order.id,
          state: order.state as OrderState,
          submittedById: order.submittedById,
          requestingOrgId: order.requestingOrgId,
          endpoints: [],
        },
        payload: { rejectionReason: dto.rejectionReason },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: { state: 'rejected', rejectionReason: dto.rejectionReason },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.rejected',
          diff: { reason: dto.rejectionReason },
          orderId: id,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }

  async cancelOrder(id: string, dto: CancelOrderDto, user: AuthenticatedUser) {
    const order = await this.prisma.crossConnectOrder.findUniqueOrThrow({ where: { id } });

    const isOperator = ['super_admin', 'ops_manager'].includes(user.role);
    if (!isOperator && order.requestingOrgId !== user.orgId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      orderMachine.transition(order.state as OrderState, 'cancelled', {
        actorId: user.id,
        actorRole: user.role,
        entity: {
          id: order.id,
          state: order.state as OrderState,
          submittedById: order.submittedById,
          requestingOrgId: order.requestingOrgId,
          endpoints: [],
        },
      });
    } catch (err) {
      toHttpException(err);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.crossConnectOrder.update({
        where: { id },
        data: {
          state: 'cancelled',
          cancelledAt: new Date(),
          cancelledReason: dto.cancelledReason,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'CrossConnectOrder',
          entityId: id,
          action: 'order.cancelled',
          diff: { reason: dto.cancelledReason },
          orderId: id,
          occurredAt: new Date(),
        },
      });

      return updated;
    });
  }
}
