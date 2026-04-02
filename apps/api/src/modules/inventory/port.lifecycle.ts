// ══════════════════════════════════════════════════════════════════════════════
// PORT STATE LIFECYCLE
//
// Purpose:
//   Port state is a denormalised live-status field. PortReservation records
//   provide the full history. This file defines the valid port state transitions
//   and their triggering events so that callers (path lifecycle, repair, maintenance)
//   make consistent, auditable port changes.
//
// State diagram:
//
//            ┌──────────────────────────────────────────────────────┐
//            ▼                                                       │
//         available ─────────► reserved ─────────► in_use ──────────┘
//            ▲                    │                   │
//            │                    │ (order cancel)    │ (disconnect)
//            └────────────────────┘◄──────────────────┘
//
//         available ◄──────── maintenance ◄──────── available
//
//         any non-decommissioned ──► faulty
//         faulty ──────────────────► available | in_use  (after repair)
//         any ─────────────────────► decommissioned  (terminal; physical removal)
//
// Key invariant: port.state is an optimistic snapshot of the current status.
//   - 'reserved':  a PortReservation(active) exists; cable physically not yet installed
//   - 'in_use':    the port is carrying live traffic (CablePath is active)
//   - 'available': no active PortReservation
//   The state machine here guards direct updates to port.state.
//   The PortReservationService (separate file) handles the reservation record + port
//   state update atomically under a SELECT FOR UPDATE lock.
//
// Billing: no billing events from port state changes directly.
// ══════════════════════════════════════════════════════════════════════════════

import { PortState, UserRole } from '@xc/types';
import {
    InsufficientRoleError,
} from '../../common/errors/domain.errors';
import { TransitionContext, TransitionDef } from '../../common/state-machine/state-machine';

export interface PortGuardEntity {
  id: string;
  state: PortState;
  panelId: string;
}

type PortCtx = TransitionContext<PortGuardEntity>;

function requireRole(ctx: PortCtx, ...roles: UserRole[]): void {
  if (ctx.actorId && ctx.actorRole && !(roles as string[]).includes(ctx.actorRole)) {
    throw new InsufficientRoleError(roles, ctx.actorRole);
  }
}

export const PORT_TRANSITIONS: TransitionDef<PortState, PortGuardEntity>[] = [
  //
  // 1. available → reserved
  //    Triggered by: PortReservationService.reserve() (which runs under SELECT FOR UPDATE)
  //    Actor:  system / ops (inside a DB transaction — actor may be undefined)
  //    Guards: handled by lock in PortReservationService, not here
  //
  {
    from: 'available',
    to: 'reserved',
    description: 'Port reserved for a planned cable path',
    guard() { /* lock enforced at DB level in PortReservationService */ },
  },

  //
  // 2. reserved → in_use
  //    Triggered by: CablePath installed → active (install WO completion)
  //    Actor:  system / ops_technician
  //
  {
    from: 'reserved',
    to: 'in_use',
    description: 'Port activated — carrying live traffic on an active cable path',
    guard() { /* driven by CablePath state machine; no additional guard here */ },
  },

  //
  // 3. in_use → available
  //    Triggered by: CablePath active → decommissioned (disconnect WO completion)
  //    Actor:  system / ops_technician
  //
  {
    from: 'in_use',
    to: 'available',
    description: 'Port released — cable path decommissioned',
    guard() { /* driven by CablePath decommission flow */ },
  },

  //
  // 4. reserved → available
  //    Triggered by: order cancellation, path abandoned (planned → decommissioned)
  //    Actor:  system / ops
  //
  {
    from: 'reserved',
    to: 'available',
    description: 'Port reservation cancelled — port returned to inventory',
    guard() { /* driven by cancellation flow */ },
  },

  //
  // 5. available → maintenance
  //    Actor:  ops_manager, super_admin
  //    Use case: planned maintenance window on a panel or port
  //
  {
    from: 'available',
    to: 'maintenance',
    description: 'Port placed into planned maintenance',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin, UserRole.ops_technician);
    },
  },

  //
  // 6. maintenance → available
  //    Actor:  ops_manager, ops_technician, super_admin
  //
  {
    from: 'maintenance',
    to: 'available',
    description: 'Port returned to available after maintenance',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin, UserRole.ops_technician);
    },
  },

  //
  // 7. available / reserved / in_use → faulty
  //    Actor:  ops_technician (raises fault), ops_manager, super_admin, or system monitor
  //
  {
    from: ['available', 'reserved', 'in_use'],
    to: 'faulty',
    description: 'Port fault raised — physical issue detected',
    guard(ctx) {
      if (ctx.actorId) {
        requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      }
    },
  },

  //
  // 8. faulty → available
  //    Triggered by: repair WO completed; port was unallocated before fault
  //
  {
    from: 'faulty',
    to: 'available',
    description: 'Port fault resolved — port returned to inventory',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 9. faulty → in_use
  //    Triggered by: repair WO completed; port was serving an active path before fault
  //    This covers emergency repairs on in-service connections.
  //
  {
    from: 'faulty',
    to: 'in_use',
    description: 'Port fault resolved — port returned to active service',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 10. any non-decommissioned → decommissioned  (physical removal)
  //     Actor:  ops_manager, super_admin only
  //     Guards: for in_use ports — must have a service disconnect WO completed first
  //             (service layer enforces this; guard only checks role)
  //
  {
    from: ['available', 'reserved', 'faulty', 'maintenance'],
    to: 'decommissioned',
    description: 'Port permanently decommissioned — physical port removed or panel retired',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
    },
  },
];

// ── Invalid transitions (documentation) ──────────────────────────────────────
//
//  decommissioned → any    BLOCKED — terminal; physical port no longer exists
//  in_use → reserved       BLOCKED — use reroute flow; don't directly demote to reserved
//  available → in_use      BLOCKED — must pass through reserved first
//  maintenance → in_use    BLOCKED — maintenance ports aren't carrying live traffic
//
// ─────────────────────────────────────────────────────────────────────────────
