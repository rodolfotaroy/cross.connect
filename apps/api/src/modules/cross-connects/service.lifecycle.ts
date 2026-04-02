// ══════════════════════════════════════════════════════════════════════════════
// CROSS-CONNECT SERVICE LIFECYCLE
//
// Purpose:
//   Governs the operational state of a provisioned cross-connect service from
//   initial provisioning through activation, optional suspension, and
//   eventual disconnection. The service record is the billing anchor and
//   persists across reroutes and repairs.
//
// State diagram:
//
//   provisioning ──────────────────────────────────────────► disconnected (abort)
//       │
//       ▼
//     active ─────────────────────────────────────────────► suspended
//       │                                                       │
//       ▼ (disconnect request)                                  ▼
//   pending_disconnect                                        active (resume)
//       │
//       ▼
//   disconnected  (terminal)
//
// Note: provisioning is created by the orders service when an order is approved.
//       The transition provisioning → active is driven by install WorkOrder completion.
//       The transition active → pending_disconnect is driven by a disconnect request.
//       The transition pending_disconnect → disconnected is driven by disconnect WO completion.
//
// Billing:
//   provisioning → active:              emit BillingTriggerEvent(service_activated)
//   pending_disconnect → disconnected:  emit BillingTriggerEvent(service_disconnected)
//   provisioning → disconnected (abort): no billing event (never went active)
// ══════════════════════════════════════════════════════════════════════════════

import { ServiceState, UserRole } from '@xc/types';
import {
  InsufficientRoleError,
  MissingTransitionDataError,
  TransitionGuardError,
} from '../../common/errors/domain.errors';
import { TransitionContext, TransitionDef } from '../../common/state-machine/state-machine';

export interface ServiceGuardEntity {
  id: string;
  state: ServiceState;
  isTemporary: boolean;
  expiresAt: Date | null;
  // Derived fields joined for guard use
  hasActiveInstallWorkOrder: boolean; // any WO in [assigned|in_progress|pending_test]
  hasActiveCablePath: boolean; // any CablePath with state='active'
}

type ServiceCtx = TransitionContext<ServiceGuardEntity>;

function requireRole(ctx: ServiceCtx, ...roles: UserRole[]): void {
  if (!ctx.actorRole || !(roles as string[]).includes(ctx.actorRole)) {
    throw new InsufficientRoleError(roles, ctx.actorRole);
  }
}

function requireField(ctx: ServiceCtx, field: string): void {
  const value = ctx.payload?.[field];
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new MissingTransitionDataError(field);
  }
}

export const SERVICE_TRANSITIONS: TransitionDef<ServiceState, ServiceGuardEntity>[] = [
  //
  // 1. provisioning → active
  //    Triggered by: install WorkOrder completing pending_test → completed
  //    Actor:  ops_technician (completing WO), ops_manager, super_admin
  //    Guards: a CablePath for this service must be in 'installed' state
  //    Billing: emit BillingTriggerEvent(service_activated) with mrcCents snapshot
  //
  {
    from: 'provisioning',
    to: 'active',
    description: 'Service activated after successful physical installation and test',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      if (!ctx.entity.hasActiveCablePath) {
        throw new TransitionGuardError(
          'Service can only be activated once a cable path has been successfully installed and tested',
        );
      }
    },
  },

  //
  // 2. active → suspended
  //    Actor:  ops_manager, super_admin
  //    Guards: reason required; not used for temporary XC expiry (use disconnect instead)
  //    Note:   suspension is an operator-initiated action (e.g. payment failure, abuse).
  //            Customer cannot self-suspend in MVP.
  //    Billing: no billing event (MRC continues during suspension in MVP)
  //
  {
    from: 'active',
    to: 'suspended',
    description: 'Service administratively suspended',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      requireField(ctx, 'reason');
    },
  },

  //
  // 3. suspended → active
  //    Actor:  ops_manager, super_admin
  //    Guards: none beyond role
  //    Billing: no billing event
  //
  {
    from: 'suspended',
    to: 'active',
    description: 'Service reactivated after suspension',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 4. active → pending_disconnect
  //    Actor:  ops_manager, super_admin (on behalf of customer), customer_admin (self-serve)
  //    Guards: disconnect WO will be created as a side effect
  //    Note:   for temporary XC expiry, this transition is triggered by the expiry job
  //            (actorId = undefined for system-initiated)
  //    Billing: no billing event yet (emitted on final disconnection)
  //
  {
    from: 'active',
    to: 'pending_disconnect',
    description: 'Disconnect request initiated — awaiting field work',
    guard(ctx) {
      if (ctx.actorId) {
        requireRole(
          ctx,
          UserRole.customer_admin,
          UserRole.customer_orderer,
          UserRole.ops_manager,
          UserRole.super_admin,
        );
      }
      // actorId = undefined = system job (temporary XC expiry) — always allowed
    },
  },

  //
  // 5. pending_disconnect → disconnected
  //    Triggered by: disconnect WorkOrder completing
  //    Actor:  ops_technician, ops_manager, super_admin
  //    Guards: no active cable paths remaining
  //    Billing: emit BillingTriggerEvent(service_disconnected) with final MRC/NRC snapshot
  //
  {
    from: 'pending_disconnect',
    to: 'disconnected',
    description: 'Service fully disconnected after field work completion',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      if (ctx.entity.hasActiveCablePath) {
        throw new TransitionGuardError(
          'All cable paths must be decommissioned before the service can be marked disconnected',
        );
      }
    },
  },

  //
  // 6. provisioning → disconnected  (abort provisioning)
  //    Actor:  ops_manager, super_admin
  //    Guards: no install WO in [in_progress | pending_test] — work must not have started
  //    Billing: no billing event (service was never active)
  //    Note:   this is for "cancel after approval but before field work begins"
  //            If work has started, use the standard disconnect flow instead.
  //
  {
    from: 'provisioning',
    to: 'disconnected',
    description: 'Provisioning aborted before any field work started',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      if (ctx.entity.hasActiveInstallWorkOrder) {
        throw new TransitionGuardError(
          'Cannot abort provisioning while an install work order is in progress. ' +
            'Use the disconnect workflow instead.',
        );
      }
    },
  },
];

// ── Invalid transitions (documentation) ──────────────────────────────────────
//
//  disconnected  → any            BLOCKED — terminal
//  active        → provisioning   BLOCKED — no backward traversal
//  suspended     → pending_disconnect  BLOCKED — must resume first, then disconnect
//  provisioning  → pending_disconnect  BLOCKED — hasn't served traffic yet; use abort
//
// ─────────────────────────────────────────────────────────────────────────────
