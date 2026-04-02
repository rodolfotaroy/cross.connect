// ══════════════════════════════════════════════════════════════════════════════
// CABLE PATH (PHYSICAL INSTALLATION) LIFECYCLE
//
// Purpose:
//   Governs the physical implementation of a service from initial port
//   assignment through cable installation, testing, activation, and eventual
//   decommissioning. Covers both install and reroute scenarios.
//
// State diagram:
//
//   planned ─────────────────────────────────────────────────► decommissioned
//      │ (all cable labels recorded)             (order cancelled / abort)
//      ▼
//   installed ───────────────────────────────────────────────► decommissioned
//      │ (OTDR/continuity test passed)              (failed install, abandoned)
//      ▼
//    active ──────────────────────────────────────────────────► decommissioned
//      │ (reroute initiated)                         (disconnect WO completed)
//      ▼
//   rerouting ────────────────────────────────────────────────► decommissioned
//             (new path for same role goes active)
//
// Reroute flow:
//   OLD path:  active → rerouting → decommissioned
//   NEW path:  (created fresh as) planned → installed → active
//   When new path reaches 'active', old path moves rerouting → decommissioned atomically.
//
// Billing:
//   planned → active (via installed):  contributes to service activation (see service lifecycle)
//   reroute complete:                  emit BillingTriggerEvent(reroute_completed) if policy charges
//   decommissioned:                    no direct event; service lifecycle handles disconnect billing
// ══════════════════════════════════════════════════════════════════════════════

import { PathState, UserRole } from '@xc/types';
import {
    InsufficientRoleError,
    TransitionGuardError
} from '../../common/errors/domain.errors';
import { TransitionContext, TransitionDef } from '../../common/state-machine/state-machine';

export interface PathGuardEntity {
  id: string;
  state: PathState;
  pathRole: string;
  serviceId: string;
  // Derived
  allSegmentsHaveCableLabel: boolean;  // required before planned → installed
  segmentCount: number;                // must be > 0 to be installable
}

type PathCtx = TransitionContext<PathGuardEntity>;

function requireRole(ctx: PathCtx, ...roles: UserRole[]): void {
  if (!ctx.actorRole || !(roles as string[]).includes(ctx.actorRole)) {
    throw new InsufficientRoleError(roles, ctx.actorRole);
  }
}

export const PATH_TRANSITIONS: TransitionDef<PathState, PathGuardEntity>[] = [
  //
  // 1. planned → installed
  //    Actor:  ops_technician (records physical cable run in the field)
  //    Guards: at least one segment defined; all segments have a physicalCableLabel
  //    Side effects: sets path.installedAt, path.installedById
  //    Port state change: none yet (ports remain 'reserved')
  //
  {
    from: 'planned',
    to: 'installed',
    description: 'Physical cable installation recorded — awaiting continuity test',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
      if (ctx.entity.segmentCount === 0) {
        throw new TransitionGuardError(
          'Cannot mark path as installed: no path segments have been defined',
        );
      }
      if (!ctx.entity.allSegmentsHaveCableLabel) {
        throw new TransitionGuardError(
          'All path segments must have a physicalCableLabel recorded before marking as installed',
        );
      }
    },
  },

  //
  // 2. installed → active
  //    Triggered by: install WorkOrder pending_test → completed
  //    Actor:  ops_technician, ops_manager
  //    Guards: none beyond role (WO completion is the gate)
  //    Side effects: all ports in path: reserved → in_use
  //                  if this is the only/primary path and service is provisioning:
  //                    service transitions provisioning → active
  //                    BillingTriggerEvent(service_activated) emitted
  //
  {
    from: 'installed',
    to: 'active',
    description: 'Continuity test passed — path is carrying live traffic',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 3. active → rerouting
  //    Actor:  ops_manager, super_admin
  //    Guards: a NEW planned CablePath for the same serviceId/pathRole must exist
  //            (created as a precondition before calling this transition)
  //    Side effects: reroute WO created for the new planned path
  //    Billing: none yet (emitted on reroute completion)
  //
  {
    from: 'active',
    to: 'rerouting',
    description: 'Reroute initiated — new path being installed in parallel',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      // The new planned path for same (serviceId, pathRole) must already exist.
      // This is validated at the service layer before calling the state machine.
      // Guard here only checks role.
    },
  },

  //
  // 4. rerouting → decommissioned
  //    Triggered by: the new replacement path reaching 'active' state (atomic with new path activation)
  //    Actor:  ops_technician, ops_manager (completing reroute WO)
  //    Guards: the replacement path for same (serviceId, pathRole) is now 'active'
  //    Side effects: all ports in this OLD path: in_use → available
  //                  PortReservation records: active → released
  //                  BillingTriggerEvent(reroute_completed) if NRC policy applies
  //
  {
    from: 'rerouting',
    to: 'decommissioned',
    description: 'Old path decommissioned after reroute to new path completed',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 5. installed → decommissioned  (abandon install)
  //    Actor:  ops_manager, super_admin
  //    Guards: install WO must not be in [pending_test | completed]
  //    Side effects: ports: reserved → available; PortReservation: active → cancelled
  //
  {
    from: 'installed',
    to: 'decommissioned',
    description: 'Installation abandoned — ports released',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
    },
  },

  //
  // 6. planned → decommissioned  (cancel before physical work)
  //    Triggered by: order cancellation before any field work
  //    Actor:  ops_manager, super_admin, or system (order cancel cascade)
  //    Guards: none — if the path is only 'planned', no physical work has been done
  //    Side effects: ports: reserved → available; PortReservation: active → cancelled
  //
  {
    from: 'planned',
    to: 'decommissioned',
    description: 'Planned path cancelled before any physical installation',
    guard(ctx) {
      if (ctx.actorId) {
        requireRole(ctx, UserRole.ops_manager, UserRole.super_admin);
      }
    },
  },

  //
  // 7. active → decommissioned  (disconnect)
  //    Triggered by: disconnect WorkOrder completing
  //    Actor:  ops_technician, ops_manager
  //    Guards: none beyond role (WO completion is the gate)
  //    Side effects: ports: in_use → available; PortReservation: active → released
  //
  {
    from: 'active',
    to: 'decommissioned',
    description: 'Path physically removed as part of service disconnect',
    guard(ctx) {
      requireRole(ctx, UserRole.ops_technician, UserRole.ops_manager, UserRole.super_admin);
    },
  },
];

// ── Invalid transitions (documentation) ──────────────────────────────────────
//
//  decommissioned → any     BLOCKED — terminal
//  active → planned         BLOCKED — no backward traversal
//  installed → planned      BLOCKED — no backward traversal (create new path for retry)
//  rerouting → active       BLOCKED — rerouting path cannot be re-activated;
//                                      it is being replaced
//  planned → active         BLOCKED — must pass through installed (skip-install not allowed)
//
// ─────────────────────────────────────────────────────────────────────────────
