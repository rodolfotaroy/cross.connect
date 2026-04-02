// ══════════════════════════════════════════════════════════════════════════════
// WORK ORDER LIFECYCLE
//
// Purpose:
//   Governs the operational lifecycle of field work instructions. A WorkOrder
//   is created for each distinct field task (install, disconnect, reroute, repair).
//   Task completion drives downstream state machine transitions in the service
//   and cable path lifecycles.
//
// State diagram:
//
//   created ──────────────────────────────────────────────────► cancelled
//      │ (ops assigns technician)                                   ▲
//      ▼                                                            │
//   assigned ─────────────────────────────────────────────────── cancelled
//      │ (tech checks in)
//      ▼
//   in_progress ──────────────────────────────────────────────► pending_test
//      │◄────────────────────────────────────────────────────── (test failed, redo)
//      ▼
//   pending_test
//      │ (test passed, sign-off)
//      ▼
//   completed  (terminal)
//
// WO type-specific side effects on completion:
//   install:    CablePath installed→active, Service provisioning→active,
//               BillingTriggerEvent(service_activated)
//   disconnect: CablePath active→decommissioned, Service pending_disconnect→disconnected,
//               BillingTriggerEvent(service_disconnected)
//   reroute:    New CablePath installed→active, old CablePath rerouting→decommissioned,
//               BillingTriggerEvent(reroute_completed)
//   repair:     Port faulty→in_use (if port was serving an active service),
//               or faulty→available (if port was unallocated)
//   audit_check: no state changes — records findings only
//
// Billing: no direct billing events from WO transitions, only indirectly via side effects above.
// ══════════════════════════════════════════════════════════════════════════════

import { UserRole, WorkOrderState, WorkOrderType } from '@xc/types';
import {
    InsufficientRoleError,
    MissingTransitionDataError,
    TransitionGuardError,
} from '../../common/errors/domain.errors';
import { TransitionContext, TransitionDef } from '../../common/state-machine/state-machine';

export interface WorkOrderGuardEntity {
  id: string;
  state: WorkOrderState;
  woType: WorkOrderType;
  assignedToId: string | null;
  serviceId: string;
  priority: number;
}

type WoCtx = TransitionContext<WorkOrderGuardEntity>;

function requireRole(ctx: WoCtx, ...roles: UserRole[]): void {
  if (!ctx.actorRole || !(roles as string[]).includes(ctx.actorRole)) {
    throw new InsufficientRoleError(roles, ctx.actorRole);
  }
}

function requireField(ctx: WoCtx, field: string): void {
  const value = ctx.payload?.[field];
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new MissingTransitionDataError(field);
  }
}

export const WORK_ORDER_TRANSITIONS: TransitionDef<WorkOrderState, WorkOrderGuardEntity>[] = [
  //
  // 1. created → assigned
  //    Actor:  ops_manager, super_admin
  //    Guards: assignee must be provided in payload; ops_technician role enforced in service layer
  //
  {
    from: 'created',
    to: 'assigned',
    description: 'Work order assigned to a technician',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'assignedToId');
    },
  },

  //
  // 2. assigned → in_progress
  //    Actor:  the assigned technician or ops_manager/super_admin
  //    Guards: caller must be the assigned technician (or higher role)
  //    Side effects: sets workOrder.startedAt
  //
  {
    from: 'assigned',
    to: 'in_progress',
    description: 'Technician checks in and begins field work',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      const isAssigned =
        ctx.actorRole === UserRole.ops_manager ||
        ctx.actorRole === UserRole.super_admin ||
        ctx.actorId === ctx.entity.assignedToId;
      if (!isAssigned) {
        throw new TransitionGuardError(
          'Only the assigned technician or a manager can start a work order',
        );
      }
    },
  },

  //
  // 3. in_progress → pending_test
  //    Actor:  ops_technician (assigned), ops_manager
  //    Guards: techNotes must be provided (field report required)
  //
  {
    from: 'in_progress',
    to: 'pending_test',
    description: 'Field work complete — awaiting continuity/optical test',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'techNotes');
      const isAssigned =
        ctx.actorRole !== UserRole.ops_technician ||
        ctx.actorId === ctx.entity.assignedToId;
      if (!isAssigned) {
        throw new TransitionGuardError(
          'Only the assigned technician or a manager can advance to pending_test',
        );
      }
    },
  },

  //
  // 4. pending_test → completed
  //    Actor:  ops_technician, ops_manager
  //    Guards: techNotes non-empty; test result doc recommended but not enforced in MVP
  //    Side effects (dispatched by WorkOrdersService.complete — not in guard):
  //      install WO  → activates CablePath + Service → BillingTriggerEvent
  //      disconnect  → decommissions CablePath + Service → BillingTriggerEvent
  //      reroute     → swap paths → BillingTriggerEvent
  //      repair      → restores port state
  //
  {
    from: 'pending_test',
    to: 'completed',
    description: 'Test passed — work order signed off and completed',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'techNotes');
    },
  },

  //
  // 5. pending_test → in_progress  (test failed, rework required)
  //    Actor:  ops_technician, ops_manager
  //    Guards: failureReason required
  //
  {
    from: 'pending_test',
    to: 'in_progress',
    description: 'Test failed — technician must redo physical work',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'failureReason');
    },
  },

  //
  // 6. created → cancelled
  //    Actor:  ops_manager, super_admin
  //    Guards: cancellation reason required
  //
  {
    from: 'created',
    to: 'cancelled',
    description: 'Work order cancelled before assignment',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'cancellationReason');
    },
  },

  //
  // 7. assigned → cancelled
  //    Actor:  ops_manager, super_admin
  //    Guards: cannot cancel a disconnect WO that is protecting an active service
  //
  {
    from: 'assigned',
    to: 'cancelled',
    description: 'Work order cancelled after assignment but before field work',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'cancellationReason');
      if (ctx.entity.woType === WorkOrderType.disconnect) {
        throw new TransitionGuardError(
          'Disconnect work orders cannot be cancelled once assigned. ' +
          'Use the service resume flow if the disconnect is no longer required.',
        );
      }
    },
  },
];

// ── Invalid transitions (documentation) ──────────────────────────────────────
//
//  completed    → any         BLOCKED — terminal
//  cancelled    → any         BLOCKED — terminal
//  in_progress  → created     BLOCKED — no backward traversal
//  in_progress  → assigned    BLOCKED — no backward traversal
//  in_progress  → cancelled   BLOCKED — field work started; use abort procedure then cancel
//  pending_test → cancelled   BLOCKED — test already in progress; resolve test first
//
// ─────────────────────────────────────────────────────────────────────────────
