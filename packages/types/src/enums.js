'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.WorkOrderTaskState =
  exports.ApprovalState =
  exports.ApprovalDecision =
  exports.ReservationState =
  exports.PathwayType =
  exports.DemarcType =
  exports.SegmentType =
  exports.BillingEventType =
  exports.DocumentType =
  exports.PanelType =
  exports.RoomType =
  exports.EndpointType =
  exports.EndpointSide =
  exports.MediaType =
  exports.ServiceType =
  exports.PathRole =
  exports.PathState =
  exports.PortState =
  exports.WorkOrderType =
  exports.WorkOrderState =
  exports.ServiceState =
  exports.OrderState =
  exports.UserRole =
  exports.OrgType =
    void 0;
exports.OrgType = {
  operator: 'operator',
  customer: 'customer',
  carrier: 'carrier',
  cloud_provider: 'cloud_provider',
  exchange: 'exchange',
};
exports.UserRole = {
  super_admin: 'super_admin',
  ops_manager: 'ops_manager',
  ops_technician: 'ops_technician',
  customer_admin: 'customer_admin',
  customer_orderer: 'customer_orderer',
  customer_viewer: 'customer_viewer',
};
exports.OrderState = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'under_review',
  pending_approval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
};
exports.ServiceState = {
  provisioning: 'provisioning',
  active: 'active',
  suspended: 'suspended',
  pending_disconnect: 'pending_disconnect',
  disconnected: 'disconnected',
};
exports.WorkOrderState = {
  created: 'created',
  assigned: 'assigned',
  in_progress: 'in_progress',
  pending_test: 'pending_test',
  completed: 'completed',
  cancelled: 'cancelled',
};
exports.WorkOrderType = {
  install: 'install',
  disconnect: 'disconnect',
  reroute: 'reroute',
  repair: 'repair',
  audit_check: 'audit_check',
};
exports.PortState = {
  available: 'available',
  reserved: 'reserved',
  in_use: 'in_use',
  faulty: 'faulty',
  maintenance: 'maintenance',
  decommissioned: 'decommissioned',
};
exports.PathState = {
  planned: 'planned',
  installed: 'installed',
  active: 'active',
  rerouting: 'rerouting',
  decommissioned: 'decommissioned',
};
exports.PathRole = { primary: 'primary', diverse: 'diverse' };
exports.ServiceType = {
  customer_to_carrier: 'customer_to_carrier',
  customer_to_customer: 'customer_to_customer',
  customer_to_cloud: 'customer_to_cloud',
  exchange: 'exchange',
};
exports.MediaType = {
  smf: 'smf',
  mmf: 'mmf',
  cat6: 'cat6',
  coax: 'coax',
  dac: 'dac',
};
exports.EndpointSide = { a_side: 'a_side', z_side: 'z_side' };
exports.EndpointType = {
  customer: 'customer',
  carrier: 'carrier',
  cloud_onramp: 'cloud_onramp',
  exchange: 'exchange',
  internal: 'internal',
};
exports.RoomType = {
  standard: 'standard',
  mmr: 'mmr',
  telco_closet: 'telco_closet',
  common_area: 'common_area',
};
exports.PanelType = {
  patch_panel: 'patch_panel',
  odf: 'odf',
  fdf: 'fdf',
  demarc: 'demarc',
  splice_enclosure: 'splice_enclosure',
};
exports.DocumentType = {
  loa: 'loa',
  cfa: 'cfa',
  test_result: 'test_result',
  photo: 'photo',
  drawing: 'drawing',
  other: 'other',
};
exports.BillingEventType = {
  service_activated: 'service_activated',
  service_disconnected: 'service_disconnected',
  temporary_extended: 'temporary_extended',
  reroute_completed: 'reroute_completed',
};
exports.SegmentType = {
  patch: 'patch',
  trunk: 'trunk',
  jumper: 'jumper',
  demarc_extension: 'demarc_extension',
};
exports.DemarcType = {
  customer: 'customer',
  carrier: 'carrier',
  cloud_onramp: 'cloud_onramp',
  exchange: 'exchange',
  internal: 'internal',
};
exports.PathwayType = {
  conduit: 'conduit',
  cable_tray: 'cable_tray',
  subduct: 'subduct',
  inner_duct: 'inner_duct',
  bundle: 'bundle',
  overhead: 'overhead',
};
exports.ReservationState = {
  active: 'active',
  released: 'released',
  cancelled: 'cancelled',
};
exports.ApprovalDecision = {
  approved: 'approved',
  rejected: 'rejected',
  deferred: 'deferred',
};
exports.ApprovalState = {
  pending: 'pending',
  decided: 'decided',
};
exports.WorkOrderTaskState = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  skipped: 'skipped',
};
//# sourceMappingURL=enums.js.map
