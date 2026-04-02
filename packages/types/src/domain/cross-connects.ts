import type {
    EndpointSide,
    EndpointType,
    MediaType,
    OrderState,
    PathRole,
    PathState,
    SegmentType,
    ServiceState,
    ServiceType,
} from '../enums';

export interface CrossConnectOrderDto {
  id: string;
  orderNumber: string;
  requestingOrgId: string;
  requestingOrgName: string;
  submittedById: string;
  serviceType: ServiceType;
  mediaType: MediaType;
  speedGbps: string | null;
  isTemporary: boolean;
  requestedActiveAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  state: OrderState;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceEndpointDto {
  id: string;
  serviceId: string;
  endpointSide: EndpointSide;
  endpointType: EndpointType;
  organizationId: string | null;
  organizationName: string | null;
  demarc: string | null;
  assignedPanelId: string | null;
}

export interface CrossConnectServiceDto {
  id: string;
  serviceNumber: string;
  orderId: string;
  state: ServiceState;
  activatedAt: string | null;
  disconnectedAt: string | null;
  isTemporary: boolean;
  expiresAt: string | null;
  endpoints: ServiceEndpointDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PathSegmentDto {
  id: string;
  pathId: string;
  sequence: number;
  fromPortId: string;
  toPortId: string;
  segmentType: SegmentType;
  physicalCableLabel: string | null;
  notes: string | null;
  fromPort?: { id: string; label: string };
  toPort?: { id: string; label: string };
}

export interface CablePathDto {
  id: string;
  serviceId: string;
  pathRole: PathRole;
  state: PathState;
  installedAt: string | null;
  installedById: string | null;
  segments: PathSegmentDto[];
}
