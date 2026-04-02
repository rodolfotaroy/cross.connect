// ══════════════════════════════════════════════════════════════════════════════
// APPROVAL LIFECYCLE
//
// Purpose:
//   Governs the manager sign-off step between ops feasibility review and order
//   activation. In MVP this is a single-step workflow. The schema supports
//   multi-step (Phase 2) by adding ApprovalStep records with increasing
//   stepNumber without any schema changes.
//
// Entities:
//   ApprovalRequest — one per order; state: pending | decided
//   ApprovalStep    — one per step; decision: null | approved | rejected | deferred
//
// Flow:
//   1. Order transitions pending_approval (OrdersService creates ApprovalRequest
//      + ApprovalStep with decision=null, stepNumber=1)
//   2. Approver calls decide(decision, notes)
//      - approved  → ApprovalStep.decision=approved, ApprovalRequest.state=decided,
//                    Order state machine: pending_approval → approved
//      - rejected  → ApprovalStep.decision=rejected, ApprovalRequest.state=decided,
//                    Order state machine: pending_approval → rejected
//      - deferred  → ApprovalStep.decision=deferred (informational only),
//                    ApprovalRequest.state stays pending,
//                    AuditEvent(approval.deferred) logged, no order state change
//   3. Escalation: if dueBy is past and no decision, an escalation job sets
//                  ApprovalRequest.escalatedAt and notifies escalation target
//
// Billing: no billing events from approval decisions.
//          Billing is triggered downstream when the service activates.
// ══════════════════════════════════════════════════════════════════════════════

import { ApprovalDecision, ApprovalState, UserRole } from '@xc/types';
import {
    InsufficientRoleError,
    MissingTransitionDataError,
    TransitionGuardError,
} from '../../common/errors/domain.errors';
import { TransitionContext, TransitionDef } from '../../common/state-machine/state-machine';

export interface ApprovalRequestGuardEntity {
  id: string;
  state: ApprovalState;
  orderId: string;
  orderSubmittedById: string;         // joined from order
  currentStepApproverId: string;      // approverId on the current (latest) step
  currentStepDecision: ApprovalDecision | null;
  dueBy: Date | null;
}

type ApprovalCtx = TransitionContext<ApprovalRequestGuardEntity>;

function requireRole(ctx: ApprovalCtx, ...roles: UserRole[]): void {
  if (!ctx.actorRole || !(roles as string[]).includes(ctx.actorRole)) {
    throw new InsufficientRoleError(roles, ctx.actorRole);
  }
}

function requireField(ctx: ApprovalCtx, field: string): void {
  const value = ctx.payload?.[field];
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new MissingTransitionDataError(field);
  }
}

// ── ApprovalRequest state machine (pending → decided) ─────────────────────────

export const APPROVAL_REQUEST_TRANSITIONS: TransitionDef<
  ApprovalState,
  ApprovalRequestGuardEntity
>[] = [
  //
  // 1. pending → decided (via approved or rejected decision)
  //    Actor:  ops_manager, super_admin
  //    Guards: approver must not be the order's submitter
  //            current step must not already have a final decision
  //            NOTE: 'deferred' does NOT trigger this transition (request stays pending)
  //
  {
    from: 'pending',
    to: 'decided',
    description: 'Approval request resolved with a final decision',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);

      if (ctx.actorId === ctx.entity.orderSubmittedById) {
        throw new TransitionGuardError(
          'The approver cannot be the same user who submitted the order',
        );
      }

      if (ctx.entity.currentStepDecision !== null) {
        throw new TransitionGuardError(
          'This approval step has already been decided',
        );
      }

      // Require notes when rejecting
      const decision = ctx.payload?.decision as ApprovalDecision | undefined;
      if (decision === ApprovalDecision.rejected) {
        requireField(ctx, 'notes');
      }
    },
  },
];

// ── Guard for deferred decision (not a state transition on ApprovalRequest) ───
//
// Calling this guard validates the actor may record a deferral.
// The service layer handles the rest (log audit event, notify).

export function guardApprovalDeferred(ctx: ApprovalCtx): void {
  if (!ctx.actorRole || ![UserRole.ops_manager as string, UserRole.super_admin as string].includes(ctx.actorRole)) {
    throw new InsufficientRoleError([UserRole.ops_manager, UserRole.super_admin], ctx.actorRole);
  }
  if (ctx.entity.currentStepDecision !== null) {
    throw new TransitionGuardError('This approval step has already been decided');
  }
}

// ── Business rules table ──────────────────────────────────────────────────────
//
//  Decision    ApprovalRequest state after    Order state after      Billing
//  ──────────  ──────────────────────────────  ─────────────────────  ────────
//  approved    decided                         approved               none yet
//  rejected    decided                         rejected               none
//  deferred    pending (no change)             pending_approval (no change)  none
//
// ── Invalid transitions (documentation) ──────────────────────────────────────
//
//  decided → pending    BLOCKED — final decisions are immutable
//  decided → decided    BLOCKED — terminal
//
// ─────────────────────────────────────────────────────────────────────────────
