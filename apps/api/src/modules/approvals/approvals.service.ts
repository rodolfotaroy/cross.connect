import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OrdersService } from '../cross-connects/orders.service';
import type { DecideApprovalDto } from './dto/approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async getPendingQueue() {
    return this.prisma.approvalRequest.findMany({
      where: { state: 'pending' },
      include: {
        order: {
          include: {
            requestingOrg: { select: { id: true, name: true, code: true } },
            submittedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        steps: {
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getApproval(id: string) {
    return this.prisma.approvalRequest.findUniqueOrThrow({
      where: { id },
      include: {
        order: {
          include: {
            requestingOrg: { select: { id: true, name: true, code: true } },
            submittedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        steps: {
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async decide(id: string, dto: DecideApprovalDto, user: AuthenticatedUser) {
    const approval = await this.prisma.approvalRequest.findUniqueOrThrow({
      where: { id },
      include: { steps: { select: { stepNumber: true }, orderBy: { stepNumber: 'desc' } } },
    });

    if (approval.state !== 'pending') {
      throw new BadRequestException(
        `Approval is not in a decidable state (current: ${approval.state})`,
      );
    }

    const nextStepNumber = (approval.steps[0]?.stepNumber ?? 0) + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const step = await tx.approvalStep.create({
        data: {
          approvalRequestId: id,
          approverId: user.id,
          stepNumber: nextStepNumber,
          decision: dto.decision,
          notes: dto.notes ?? null,
          decidedAt: new Date(),
        },
      });

      // A 'deferred' decision keeps the request open for a future decision.
      // Only 'approved' and 'rejected' close the request permanently.
      const updated =
        dto.decision !== 'deferred'
          ? await tx.approvalRequest.update({
              where: { id },
              data: { state: 'decided' },
            })
          : await tx.approvalRequest.findUniqueOrThrow({ where: { id } });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          entityType: 'ApprovalRequest',
          entityId: id,
          action: `approval.${dto.decision}`,
          orderId: approval.orderId,
          occurredAt: new Date(),
        },
      });

      return { approval: updated, step };
    });

    // Bridge: advance the linked order to its terminal state once a final decision is made.
    // This runs outside the approval transaction to avoid nesting $transaction calls.
    if (dto.decision === 'approved') {
      await this.ordersService.approveOrder(approval.orderId, { notes: dto.notes }, user);
    } else if (dto.decision === 'rejected') {
      await this.ordersService.rejectOrder(
        approval.orderId,
        { rejectionReason: dto.notes ?? 'Rejected during approval review' },
        user,
      );
    }

    return result;
  }
}
