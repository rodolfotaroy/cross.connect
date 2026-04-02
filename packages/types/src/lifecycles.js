"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT_TERMINAL_STATES = exports.WO_TERMINAL_STATES = exports.PATH_TERMINAL_STATES = exports.SERVICE_TERMINAL_STATES = exports.ORDER_TERMINAL_STATES = exports.BILLING_TRIGGER_ACTIONS = exports.AuditAction = void 0;
exports.AuditAction = {
    ORDER_DRAFT_CREATED: 'order.draft_created',
    ORDER_SUBMITTED: 'order.submitted',
    ORDER_REVIEW_STARTED: 'order.review_started',
    ORDER_FEASIBLE: 'order.feasibility_passed',
    ORDER_APPROVAL_SENT: 'order.approval_requested',
    ORDER_APPROVED: 'order.approved',
    ORDER_REJECTED: 'order.rejected',
    ORDER_CANCELLED: 'order.cancelled',
    SERVICE_CREATED: 'service.created',
    SERVICE_ACTIVATED: 'service.activated',
    SERVICE_SUSPENDED: 'service.suspended',
    SERVICE_RESUMED: 'service.resumed',
    SERVICE_DISCONNECT_REQUESTED: 'service.disconnect_requested',
    SERVICE_DISCONNECTED: 'service.disconnected',
    SERVICE_PROVISIONING_ABORTED: 'service.provisioning_aborted',
    SERVICE_EXPIRY_EXTENDED: 'service.expiry_extended',
    PATH_PLANNED: 'cable_path.planned',
    PATH_INSTALLED: 'cable_path.installed',
    PATH_ACTIVATED: 'cable_path.activated',
    PATH_REROUTE_STARTED: 'cable_path.reroute_initiated',
    PATH_DECOMMISSIONED: 'cable_path.decommissioned',
    PORT_RESERVED: 'port.reserved',
    PORT_ACTIVATED: 'port.activated',
    PORT_RELEASED: 'port.released',
    PORT_RESERVATION_CANCELLED: 'port.reservation_cancelled',
    PORT_FAULT_RAISED: 'port.fault_raised',
    PORT_FAULT_REPAIRED: 'port.fault_repaired',
    PORT_MAINTENANCE_STARTED: 'port.maintenance_started',
    PORT_MAINTENANCE_ENDED: 'port.maintenance_ended',
    PORT_DECOMMISSIONED: 'port.decommissioned',
    RESERVATION_CREATED: 'port_reservation.created',
    RESERVATION_RELEASED: 'port_reservation.released',
    RESERVATION_CANCELLED: 'port_reservation.cancelled',
    WO_CREATED: 'work_order.created',
    WO_ASSIGNED: 'work_order.assigned',
    WO_STARTED: 'work_order.started',
    WO_PENDING_TEST: 'work_order.pending_test',
    WO_COMPLETED: 'work_order.completed',
    WO_CANCELLED: 'work_order.cancelled',
    WO_TASK_COMPLETED: 'work_order.task_completed',
    APPROVAL_REQUESTED: 'approval.requested',
    APPROVAL_APPROVED: 'approval.approved',
    APPROVAL_REJECTED: 'approval.rejected',
    APPROVAL_DEFERRED: 'approval.deferred',
    APPROVAL_ESCALATED: 'approval.escalated',
    DOCUMENT_UPLOADED: 'document.uploaded',
    DOCUMENT_DELETED: 'document.deleted',
};
exports.BILLING_TRIGGER_ACTIONS = new Set([
    exports.AuditAction.SERVICE_ACTIVATED,
    exports.AuditAction.SERVICE_DISCONNECTED,
    exports.AuditAction.PATH_ACTIVATED,
    exports.AuditAction.SERVICE_EXPIRY_EXTENDED,
]);
exports.ORDER_TERMINAL_STATES = ['approved', 'rejected', 'cancelled'];
exports.SERVICE_TERMINAL_STATES = ['disconnected'];
exports.PATH_TERMINAL_STATES = ['decommissioned'];
exports.WO_TERMINAL_STATES = ['completed', 'cancelled'];
exports.PORT_TERMINAL_STATES = ['decommissioned'];
//# sourceMappingURL=lifecycles.js.map