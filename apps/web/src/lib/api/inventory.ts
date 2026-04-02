import type { PanelDto, PortAvailabilityDto, PortDto } from '@xc/types';
import { apiClient } from './client';

export interface PanelWithAvailability extends PanelDto {
  availability?: PortAvailabilityDto;
}

export interface SiteAvailability {
  siteId: string;
  rooms: {
    roomId: string;
    roomName: string;
    roomCode: string;
    roomType: string;
    total: number;
    available: number;
    inUse: number;
    reserved: number;
  }[];
}

export const inventoryApi = {
  getAvailability(token: string, panelId: string) {
    return apiClient.get<PortAvailabilityDto>(`/inventory/panels/${panelId}/availability`, token);
  },

  listPorts(token: string, panelId: string, params?: { mediaType?: string; state?: string }) {
    const qs = new URLSearchParams();
    if (params?.mediaType) qs.set('mediaType', params.mediaType);
    if (params?.state) qs.set('state', params.state);
    return apiClient.get<PortDto[]>(`/inventory/panels/${panelId}/ports?${qs}`, token);
  },

  listAvailablePorts(token: string, panelId: string, params?: { mediaType?: string }) {
    const qs = new URLSearchParams();
    if (params?.mediaType) qs.set('mediaType', params.mediaType);
    return apiClient.get<PortDto[]>(`/inventory/panels/${panelId}/ports/available?${qs}`, token);
  },

  listRackPanels(token: string, rackId: string) {
    return apiClient.get<PanelWithAvailability[]>(`/inventory/racks/${rackId}/panels`, token);
  },

  listRoomPanels(token: string, roomId: string) {
    return apiClient.get<PanelWithAvailability[]>(`/inventory/rooms/${roomId}/panels`, token);
  },

  listAllRoomPanels(token: string, roomId: string) {
    return apiClient.get<PanelWithAvailability[]>(`/inventory/rooms/${roomId}/panels/all`, token);
  },

  getSiteAvailability(token: string, siteId: string) {
    return apiClient.get<SiteAvailability>(`/inventory/sites/${siteId}/availability`, token);
  },

  setPortState(token: string, portId: string, state: string, reason?: string) {
    return apiClient.patch<PortDto>(`/inventory/ports/${portId}/state`, { state, reason }, token);
  },
};
