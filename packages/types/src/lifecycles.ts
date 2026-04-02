// ══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE DEFINITIONS
//
// This file centralises:
//   1. AuditAction — canonical names for every auditable event in the system
//   2. BillingTrigger — which lifecycle events produce a BillingTriggerEvent
//   3. Transition type helpers used by the state-machine engine
// ══════════════════════════════════════════════════════════════════════════════

// ── Audit action names ────────────────────────────────────────────────────────
// Convention: <entity>.<verb>  (snake_case, dotted namespace)
// These are the `action` strings stored in AuditEvent.action.

export const AuditAction = {
  // CrossConnectOrder
  ORDER_DRAFT_CREATED:    'order.draft_created',
  ORDER_SUBMITTED:        'order.submitted',
  ORDER_REVIEW_STARTED:   'order.review_started',
  ORDER_FEASIBLE:         'order.feasibility_passed',
  ORDER_APPROVAL_SENT:    'order.approval_requested',
  ORDER_APPROVED:         'order.approved',
  ORDER_REJECTED:         'order.rejected',
  ORDER_CANCELLED:        'order.cancelled',

  // CrossConnectService
  SERVICE_CREATED:            'service.created',
  SERVICE_ACTIVATED:          'service.activated',
  SERVICE_SUSPENDED:          'service.suspended',
  SERVICE_RESUMED:            'service.resumed',
  SERVICE_DISCONNECT_REQUESTED: 'service.disconnect_requested',
  SERVICE_DISCONNECTED:       'service.disconnected',
  SERVICE_PROVISIONING_ABORTED: 'service.provisioning_aborted',
  SERVICE_EXPIRY_EXTENDED:    'service.expiry_extended',

  // CablePath
  PATH_PLANNED:       'cable_path.planned',
  PATH_INSTALLED:     'cable_path.installed',
  PATH_ACTIVATED:     'cable_path.activated',
  PATH_REROUTE_STARTED: 'cable_path.reroute_initiated',
  PATH_DECOMMISSIONED: 'cable_path.decommissioned',

  // Port
  PORT_RESERVED:              'port.reserved',
  PORT_ACTIVATED:             'port.activated',          // reserved → in_use
  PORT_RELEASED:              'port.released',           // in_use → available
  PORT_RESERVATION_CANCELLED: 'port.reservation_cancelled', // reserved → available
  PORT_FAULT_RAISED:          'port.fault_raised',
  PORT_FAULT_REPAIRED:        'port.fault_repaired',
  PORT_MAINTENANCE_STARTED:   'port.maintenance_started',
  PORT_MAINTENANCE_ENDED:     'port.maintenance_ended',
  PORT_DECOMMISSIONED:        'port.decommissioned',

  // PortReservation
  RESERVATION_CREATED:    'port_reservation.created',
  RESERVATION_RELEASED:   'port_reservation.released',
  RESERVATION_CANCELLED:  'port_reservation.cancelled',

  // WorkOrder
  WO_CREATED:       'work_order.created',
  WO_ASSIGNED:      'work_order.assigned',
  WO_STARTED:       'work_order.started',
  WO_PENDING_TEST:  'work_order.pending_test',
  WO_COMPLETED:     'work_order.completed',
  WO_CANCELLED:     'work_order.cancelled',
  WO_TASK_COMPLETED: 'work_order.task_completed',

  // Approval
  APPROVAL_REQUESTED:  'approval.requested',
  APPROVAL_APPROVED:   'approval.approved',
  APPROVAL_REJECTED:   'approval.rejected',
  APPROVAL_DEFERRED:   'approval.deferred',
  APPROVAL_ESCALATED:  'approval.escalated',

  // Document
  DOCUMENT_UPLOADED:   'document.uploaded',
  DOCUMENT_DELETED:    'document.deleted',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// ── Billing trigger mapping ───────────────────────────────────────────────────
// These audit actions imply a BillingTriggerEvent must also be written.
// Used in the orchestration services to decide whether to emit billing events.

export const BILLING_TRIGGER_ACTIONS = new Set<AuditAction>([
  AuditAction.SERVICE_ACTIVATED,
  AuditAction.SERVICE_DISCONNECTED,
  AuditAction.PATH_ACTIVATED,        // for reroute_completed billing (same event, different context)
  AuditAction.SERVICE_EXPIRY_EXTENDED,
]);

// ── State machine transition helper types ─────────────────────────────────────

/** The context passed to every guard function. */
export interface TransitionContext<TEntity = unknown> {
  /** The entity being transitioned (e.g. the full CrossConnectOrder row). */
  entity: TEntity;
  /** The user performing the action. May be undefined for system/job actions. */
  actorId?: string;
  actorRole?: string;
  /** Extra domain-specific payload (e.g. rejectionReason, techNotes). */
  payload?: Record<string, unknown>;
}

/** A single allowed transition including an optional guard. */
export interface TransitionDef<S extends string, TEntity = unknown> {
  from: S | readonly S[];
  to: S;
  description: string;
  guard?: (ctx: TransitionContext<TEntity>) => void | Promise<void>;
}

// ── Well-known terminal states per entity ────────────────────────────────────

/** OrderState terminal states — no further transitions allowed. */
export const ORDER_TERMINAL_STATES = ['approved', 'rejected', 'cancelled'] as const;

/** ServiceState terminal states. */
export const SERVICE_TERMINAL_STATES = ['disconnected'] as const;

/** PathState terminal states. */
export const PATH_TERMINAL_STATES = ['decommissioned'] as const;

/** WorkOrderState terminal states. */
export const WO_TERMINAL_STATES = ['completed', 'cancelled'] as const;

/** PortState terminal state. */
export const PORT_TERMINAL_STATES = ['decommissioned'] as const;
