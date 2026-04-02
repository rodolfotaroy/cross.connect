import type {
    ConnectorType,
    MediaType,
    PanelType,
    PortState,
    RoomType,
    StrandRole,
} from '../enums';

export interface SiteDto {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  state: string | null;
  timezone: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

/** @deprecated Use SiteDto */
export type DatacenterDto = SiteDto;

export interface BuildingDto {
  id: string;
  siteId: string;
  name: string;
  code: string;
  floors: number | null;
}

export interface RoomDto {
  id: string;
  datacenterId: string;
  name: string;
  code: string;
  roomType: RoomType;
}

export interface CageDto {
  id: string;
  roomId: string;
  name: string;
  code: string;
}

export interface RackDto {
  id: string;
  cageId: string | null;  // null for room-level racks
  roomId: string | null;  // null for cage-level racks
  name: string;
  code: string;
  uSize: number;
  panels?: { id: string; code: string; name: string }[];
}

export interface PanelDto {
  id: string;
  rackId: string | null;
  roomId: string | null;
  name: string;
  code: string;
  panelType: PanelType;
  portCount: number;
  uPosition: number | null;
}

export interface PortDto {
  id: string;
  panelId: string;
  label: string;
  mediaType: MediaType;
  connectorType: ConnectorType;
  strandRole: StrandRole;
  state: PortState;
  notes: string | null;
}

export interface PortAvailabilityDto {
  panelId: string;
  total: number;
  available: number;
  reserved: number;
  inUse: number;
  faulty: number;
  maintenance: number;
}
