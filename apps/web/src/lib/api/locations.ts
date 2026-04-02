import type { BuildingDto, CageDto, DatacenterDto, PanelDto, RackDto, RoomDto } from '@xc/types';
import { apiClient } from './client';
export type { BuildingDto };

export interface SiteWithBuildings extends DatacenterDto {
  buildings: BuildingDto[];
}

export interface RoomWithPanels extends RoomDto {
  panels: PanelDto[];
}

export interface CageWithRacks extends CageDto {
  racks: RackDto[];
}

/** Cage as returned by listCages — includes active racks embedded (abbreviated). */
export interface CageEntry extends CageDto {
  racks: { id: string; code: string; name: string; uSize: number; panels: { id: string; code: string; name: string }[] }[];
}

export const sitesApi = {
  list(token: string) {
    return apiClient.get<DatacenterDto[]>('/locations/sites', token);
  },

  getOne(token: string, siteId: string) {
    return apiClient.get<DatacenterDto>(`/locations/sites/${siteId}`, token);
  },

  create(
    token: string,
    dto: { name: string; code: string; address: string; city: string; country: string },
  ) {
    return apiClient.post<DatacenterDto>('/locations/sites', dto, token);
  },

  update(
    token: string,
    siteId: string,
    dto: Partial<{ name: string; address: string; city: string; country: string }>,
  ) {
    return apiClient.patch<DatacenterDto>(`/locations/sites/${siteId}`, dto, token);
  },

  deactivate(token: string, siteId: string) {
    return apiClient.delete<void>(`/locations/sites/${siteId}`, token);
  },
};

export const buildingsApi = {
  list(token: string, siteId: string) {
    return apiClient.get<BuildingDto[]>(`/locations/sites/${siteId}/buildings`, token);
  },

  create(token: string, siteId: string, dto: { name: string; code: string; floors?: number }) {
    return apiClient.post<BuildingDto>(`/locations/sites/${siteId}/buildings`, dto, token);
  },

  update(token: string, buildingId: string, dto: Partial<{ name: string; notes: string }>) {
    return apiClient.patch<BuildingDto>(`/locations/buildings/${buildingId}`, dto, token);
  },

  deactivate(token: string, buildingId: string) {
    return apiClient.delete<void>(`/locations/buildings/${buildingId}`, token);
  },
};

export const roomsApi = {
  list(token: string, buildingId: string) {
    return apiClient.get<RoomDto[]>(`/locations/buildings/${buildingId}/rooms`, token);
  },

  getOne(token: string, roomId: string) {
    return apiClient.get<RoomWithPanels>(`/locations/rooms/${roomId}`, token);
  },

  getTopology(token: string, roomId: string) {
    return apiClient.get<unknown>(`/locations/rooms/${roomId}/topology`, token);
  },

  create(token: string, buildingId: string, dto: { name: string; code: string; roomType: string }) {
    return apiClient.post<RoomDto>(`/locations/buildings/${buildingId}/rooms`, dto, token);
  },

  update(token: string, roomId: string, dto: Partial<{ name: string; roomType: string; floor: string; notes: string }>) {
    return apiClient.patch<RoomDto>(`/locations/rooms/${roomId}`, dto, token);
  },

  deactivate(token: string, roomId: string) {
    return apiClient.delete<void>(`/locations/rooms/${roomId}`, token);
  },
};

export const cagesApi = {
  list(token: string, roomId: string) {
    return apiClient.get<CageEntry[]>(`/locations/rooms/${roomId}/cages`, token);
  },

  create(token: string, roomId: string, dto: { name: string; code: string }) {
    return apiClient.post<CageDto>(`/locations/rooms/${roomId}/cages`, dto, token);
  },

  update(token: string, cageId: string, dto: Partial<{ name: string; notes: string }>) {
    return apiClient.patch<CageDto>(`/locations/cages/${cageId}`, dto, token);
  },

  deactivate(token: string, cageId: string) {
    return apiClient.delete<void>(`/locations/cages/${cageId}`, token);
  },
};

export const racksApi = {
  list(token: string, cageId: string) {
    return apiClient.get<RackDto[]>(`/locations/cages/${cageId}/racks`, token);
  },

  listByRoom(token: string, roomId: string) {
    return apiClient.get<RackDto[]>(`/locations/rooms/${roomId}/racks`, token);
  },

  create(token: string, cageId: string, dto: { name: string; code: string; uSize?: number }) {
    return apiClient.post<RackDto>(`/locations/cages/${cageId}/racks`, dto, token);
  },

  createInRoom(token: string, roomId: string, dto: { name: string; code: string; uSize?: number }) {
    return apiClient.post<RackDto>(`/locations/rooms/${roomId}/racks`, dto, token);
  },

  update(token: string, rackId: string, dto: Partial<{ name: string; uSize: number; notes: string }>) {
    return apiClient.patch<RackDto>(`/locations/racks/${rackId}`, dto, token);
  },

  deactivate(token: string, rackId: string) {
    return apiClient.delete<void>(`/locations/racks/${rackId}`, token);
  },
};

export const panelsApi = {
  listInRack(token: string, rackId: string) {
    return apiClient.get<PanelDto[]>(`/locations/racks/${rackId}/panels`, token);
  },

  listInRoom(token: string, roomId: string) {
    return apiClient.get<PanelDto[]>(`/locations/rooms/${roomId}/panels`, token);
  },

  createInRack(
    token: string,
    rackId: string,
    dto: { name: string; code: string; panelType: string; portCount: number; uPosition?: number },
  ) {
    return apiClient.post<PanelDto>(`/locations/racks/${rackId}/panels`, dto, token);
  },

  createInRoom(
    token: string,
    roomId: string,
    dto: { name: string; code: string; panelType: string; portCount: number },
  ) {
    return apiClient.post<PanelDto>(`/locations/rooms/${roomId}/panels`, dto, token);
  },

  getOne(token: string, panelId: string) {
    return apiClient.get<PanelDto>(`/locations/panels/${panelId}`, token);
  },

  update(
    token: string,
    panelId: string,
    dto: Partial<{ name: string; panelType: string; uPosition: number | null; notes: string }>,
  ) {
    return apiClient.patch<PanelDto>(`/locations/panels/${panelId}`, dto, token);
  },

  deactivate(token: string, panelId: string) {
    return apiClient.delete<void>(`/locations/panels/${panelId}`, token);
  },
};

export const portsApi = {
  bulkCreate(
    token: string,
    panelId: string,
    dto: {
      count: number;
      mediaType: string;
      connectorType: string;
      labelPrefix?: string;
      alternateTxRx?: boolean;
      startPosition?: number;
    },
  ) {
    return apiClient.post<unknown>(`/locations/panels/${panelId}/ports/bulk`, dto, token);
  },
};
