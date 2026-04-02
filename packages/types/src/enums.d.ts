export declare const OrgType: {
  readonly operator: 'operator';
  readonly customer: 'customer';
  readonly carrier: 'carrier';
  readonly cloud_provider: 'cloud_provider';
  readonly exchange: 'exchange';
};
export type OrgType = (typeof OrgType)[keyof typeof OrgType];
export declare const UserRole: {
  readonly super_admin: 'super_admin';
  readonly ops_manager: 'ops_manager';
  readonly ops_technician: 'ops_technician';
  readonly customer_admin: 'customer_admin';
  readonly customer_orderer: 'customer_orderer';
  readonly customer_viewer: 'customer_viewer';
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const OrderState: {
  readonly draft: 'draft';
  readonly submitted: 'submitted';
  readonly under_review: 'under_review';
  readonly pending_approval: 'pending_approval';
  readonly approved: 'approved';
  readonly rejected: 'rejected';
  readonly cancelled: 'cancelled';
};
export type OrderState = (typeof OrderState)[keyof typeof OrderState];
export declare const ServiceState: {
  readonly provisioning: 'provisioning';
  readonly active: 'active';
  readonly suspended: 'suspended';
  readonly pending_disconnect: 'pending_disconnect';
  readonly disconnected: 'disconnected';
};
export type ServiceState = (typeof ServiceState)[keyof typeof ServiceState];
export declare const WorkOrderState: {
  readonly created: 'created';
  readonly assigned: 'assigned';
  readonly in_progress: 'in_progress';
  readonly pending_test: 'pending_test';
  readonly completed: 'completed';
  readonly cancelled: 'cancelled';
};
export type WorkOrderState = (typeof WorkOrderState)[keyof typeof WorkOrderState];
export declare const WorkOrderType: {
  readonly install: 'install';
  readonly disconnect: 'disconnect';
  readonly reroute: 'reroute';
  readonly repair: 'repair';
  readonly audit_check: 'audit_check';
};
export type WorkOrderType = (typeof WorkOrderType)[keyof typeof WorkOrderType];
export declare const PortState: {
  readonly available: 'available';
  readonly reserved: 'reserved';
  readonly in_use: 'in_use';
  readonly faulty: 'faulty';
  readonly maintenance: 'maintenance';
  readonly decommissioned: 'decommissioned';
};
export type PortState = (typeof PortState)[keyof typeof PortState];
export declare const PathState: {
  readonly planned: 'planned';
  readonly installed: 'installed';
  readonly active: 'active';
  readonly rerouting: 'rerouting';
  readonly decommissioned: 'decommissioned';
};
export type PathState = (typeof PathState)[keyof typeof PathState];
export declare const PathRole: {
  readonly primary: 'primary';
  readonly diverse: 'diverse';
};
export type PathRole = (typeof PathRole)[keyof typeof PathRole];
export declare const ServiceType: {
  readonly customer_to_carrier: 'customer_to_carrier';
  readonly customer_to_customer: 'customer_to_customer';
  readonly customer_to_cloud: 'customer_to_cloud';
  readonly exchange: 'exchange';
};
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];
export declare const MediaType: {
  readonly smf: 'smf';
  readonly mmf: 'mmf';
  readonly cat6: 'cat6';
  readonly coax: 'coax';
  readonly dac: 'dac';
};
export type MediaType = (typeof MediaType)[keyof typeof MediaType];
export declare const EndpointSide: {
  readonly a_side: 'a_side';
  readonly z_side: 'z_side';
};
export type EndpointSide = (typeof EndpointSide)[keyof typeof EndpointSide];
export declare const EndpointType: {
  readonly customer: 'customer';
  readonly carrier: 'carrier';
  readonly cloud_onramp: 'cloud_onramp';
  readonly exchange: 'exchange';
  readonly internal: 'internal';
};
export type EndpointType = (typeof EndpointType)[keyof typeof EndpointType];
export declare const RoomType: {
  readonly standard: 'standard';
  readonly mmr: 'mmr';
  readonly telco_closet: 'telco_closet';
  readonly common_area: 'common_area';
};
export type RoomType = (typeof RoomType)[keyof typeof RoomType];
export declare const PanelType: {
  readonly patch_panel: 'patch_panel';
  readonly odf: 'odf';
  readonly fdf: 'fdf';
  readonly demarc: 'demarc';
  readonly splice_enclosure: 'splice_enclosure';
};
export type PanelType = (typeof PanelType)[keyof typeof PanelType];
export declare const DocumentType: {
  readonly loa: 'loa';
  readonly cfa: 'cfa';
  readonly test_result: 'test_result';
  readonly photo: 'photo';
  readonly drawing: 'drawing';
  readonly other: 'other';
};
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
export declare const BillingEventType: {
  readonly service_activated: 'service_activated';
  readonly service_disconnected: 'service_disconnected';
  readonly temporary_extended: 'temporary_extended';
  readonly reroute_completed: 'reroute_completed';
};
export type BillingEventType = (typeof BillingEventType)[keyof typeof BillingEventType];
export declare const SegmentType: {
  readonly patch: 'patch';
  readonly trunk: 'trunk';
  readonly jumper: 'jumper';
  readonly demarc_extension: 'demarc_extension';
};
export type SegmentType = (typeof SegmentType)[keyof typeof SegmentType];
export declare const DemarcType: {
  readonly customer: 'customer';
  readonly carrier: 'carrier';
  readonly cloud_onramp: 'cloud_onramp';
  readonly exchange: 'exchange';
  readonly internal: 'internal';
};
export type DemarcType = (typeof DemarcType)[keyof typeof DemarcType];
export declare const PathwayType: {
  readonly conduit: 'conduit';
  readonly cable_tray: 'cable_tray';
  readonly subduct: 'subduct';
  readonly inner_duct: 'inner_duct';
  readonly bundle: 'bundle';
  readonly overhead: 'overhead';
};
export type PathwayType = (typeof PathwayType)[keyof typeof PathwayType];
export declare const ReservationState: {
  readonly active: 'active';
  readonly released: 'released';
  readonly cancelled: 'cancelled';
};
export type ReservationState = (typeof ReservationState)[keyof typeof ReservationState];
export declare const ApprovalDecision: {
  readonly approved: 'approved';
  readonly rejected: 'rejected';
  readonly deferred: 'deferred';
};
export type ApprovalDecision = (typeof ApprovalDecision)[keyof typeof ApprovalDecision];
export declare const ApprovalState: {
  readonly pending: 'pending';
  readonly decided: 'decided';
};
export type ApprovalState = (typeof ApprovalState)[keyof typeof ApprovalState];
export declare const WorkOrderTaskState: {
  readonly pending: 'pending';
  readonly in_progress: 'in_progress';
  readonly completed: 'completed';
  readonly skipped: 'skipped';
};
export type WorkOrderTaskState = (typeof WorkOrderTaskState)[keyof typeof WorkOrderTaskState];
