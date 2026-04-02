// String literal union enums — compatible with both Prisma enum values
// and front-end/back-end validation without importing from '@prisma/client'.

export const OrgType = {
  operator: 'operator',
  customer: 'customer',
  carrier: 'carrier',
  cloud_provider: 'cloud_provider',
  exchange: 'exchange',
} as const;
export type OrgType = (typeof OrgType)[keyof typeof OrgType];

export const UserRole = {
  super_admin: 'super_admin',
  ops_manager: 'ops_manager',
  ops_technician: 'ops_technician',
  customer_admin: 'customer_admin',
  customer_orderer: 'customer_orderer',
  customer_viewer: 'customer_viewer',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderState = {
  draft: 'draft',
  submitted: 'submitted',
  under_review: 'under_review', // ops feasibility check phase
  pending_approval: 'pending_approval', // feasibility passed; awaiting manager sign-off
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
} as const;
export type OrderState = (typeof OrderState)[keyof typeof OrderState];

export const ServiceState = {
  provisioning: 'provisioning',
  active: 'active',
  suspended: 'suspended',
  pending_disconnect: 'pending_disconnect',
  disconnected: 'disconnected',
} as const;
export type ServiceState = (typeof ServiceState)[keyof typeof ServiceState];

export const WorkOrderState = {
  created: 'created',
  assigned: 'assigned',
  in_progress: 'in_progress',
  pending_test: 'pending_test',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type WorkOrderState = (typeof WorkOrderState)[keyof typeof WorkOrderState];

export const WorkOrderType = {
  install: 'install',
  disconnect: 'disconnect',
  reroute: 'reroute',
  repair: 'repair',
  audit_check: 'audit_check',
} as const;
export type WorkOrderType = (typeof WorkOrderType)[keyof typeof WorkOrderType];

export const PortState = {
  available: 'available',
  reserved: 'reserved',
  in_use: 'in_use',
  faulty: 'faulty',
  maintenance: 'maintenance',
  decommissioned: 'decommissioned',
} as const;
export type PortState = (typeof PortState)[keyof typeof PortState];

export const PathState = {
  planned: 'planned',
  installed: 'installed',
  active: 'active',
  rerouting: 'rerouting',
  decommissioned: 'decommissioned',
} as const;
export type PathState = (typeof PathState)[keyof typeof PathState];

export const PathRole = { primary: 'primary', diverse: 'diverse' } as const;
export type PathRole = (typeof PathRole)[keyof typeof PathRole];

export const ServiceType = {
  customer_to_carrier: 'customer_to_carrier',
  customer_to_customer: 'customer_to_customer',
  customer_to_cloud: 'customer_to_cloud',
  exchange: 'exchange',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const MediaType = {
  smf: 'smf',
  mmf: 'mmf',
  cat6: 'cat6',
  coax: 'coax',
  dac: 'dac',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export const ConnectorType = {
  lc: 'lc',
  sc: 'sc',
  mtp_mpo: 'mtp_mpo',
  rj45: 'rj45',
  fc: 'fc',
} as const;
export type ConnectorType = (typeof ConnectorType)[keyof typeof ConnectorType];

export const StrandRole = {
  tx: 'tx',
  rx: 'rx',
  unspecified: 'unspecified',
} as const;
export type StrandRole = (typeof StrandRole)[keyof typeof StrandRole];

export const EndpointSide = { a_side: 'a_side', z_side: 'z_side' } as const;
export type EndpointSide = (typeof EndpointSide)[keyof typeof EndpointSide];

export const EndpointType = {
  customer: 'customer',
  carrier: 'carrier',
  cloud_onramp: 'cloud_onramp',
  exchange: 'exchange',
  internal: 'internal',
} as const;
export type EndpointType = (typeof EndpointType)[keyof typeof EndpointType];

export const RoomType = {
  standard: 'standard',
  mmr: 'mmr',
  telco_closet: 'telco_closet',
  common_area: 'common_area',
} as const;
export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export const PanelType = {
  patch_panel: 'patch_panel',
  odf: 'odf',
  fdf: 'fdf',
  demarc: 'demarc',
  splice_enclosure: 'splice_enclosure',
} as const;
export type PanelType = (typeof PanelType)[keyof typeof PanelType];

export const DocumentType = {
  loa: 'loa',
  cfa: 'cfa',
  test_result: 'test_result',
  photo: 'photo',
  drawing: 'drawing',
  other: 'other',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const BillingEventType = {
  service_activated: 'service_activated',
  service_disconnected: 'service_disconnected',
  temporary_extended: 'temporary_extended',
  reroute_completed: 'reroute_completed',
} as const;
export type BillingEventType = (typeof BillingEventType)[keyof typeof BillingEventType];

export const SegmentType = {
  patch: 'patch',
  trunk: 'trunk',
  jumper: 'jumper',
  demarc_extension: 'demarc_extension',
} as const;
export type SegmentType = (typeof SegmentType)[keyof typeof SegmentType];

export const DemarcType = {
  customer: 'customer',
  carrier: 'carrier',
  cloud_onramp: 'cloud_onramp',
  exchange: 'exchange',
  internal: 'internal',
} as const;
export type DemarcType = (typeof DemarcType)[keyof typeof DemarcType];

export const PathwayType = {
  conduit: 'conduit',
  cable_tray: 'cable_tray',
  subduct: 'subduct',
  inner_duct: 'inner_duct',
  bundle: 'bundle',
  overhead: 'overhead',
} as const;
export type PathwayType = (typeof PathwayType)[keyof typeof PathwayType];

export const ReservationState = {
  active: 'active',
  released: 'released',
  cancelled: 'cancelled',
} as const;
export type ReservationState = (typeof ReservationState)[keyof typeof ReservationState];

export const ApprovalDecision = {
  approved: 'approved',
  rejected: 'rejected',
  deferred: 'deferred',
} as const;
export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];

export const ApprovalState = {
  pending: 'pending',
  decided: 'decided',
} as const;
export type ApprovalState = (typeof ApprovalState)[keyof typeof ApprovalState];

export const WorkOrderTaskState = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  skipped: 'skipped',
} as const;
export type WorkOrderTaskState = (typeof WorkOrderTaskState)[keyof typeof WorkOrderTaskState];
