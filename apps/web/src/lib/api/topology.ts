import type { CablePathDto } from '@xc/types';
import { apiClient } from './client';

export const cablePathsApi = {
  create(
    token: string,
    serviceId: string,
    data: {
      pathRole: 'primary' | 'diverse';
      notes?: string;
      segments: Array<{
        sequence: number;
        fromPortId: string;
        toPortId: string;
        segmentType: string;
        physicalCableLabel?: string | null;
      }>;
    },
  ) {
    return apiClient.post<CablePathDto>(`/services/${serviceId}/cable-paths`, data, token);
  },

  markInstalled(token: string, serviceId: string, pathId: string, installedAt?: string) {
    return apiClient.patch<CablePathDto>(
      `/services/${serviceId}/cable-paths/${pathId}/installed`,
      { installedAt },
      token,
    );
  },

  activate(token: string, serviceId: string, pathId: string) {
    return apiClient.patch<CablePathDto>(
      `/services/${serviceId}/cable-paths/${pathId}/activate`,
      {},
      token,
    );
  },

  initiateReroute(token: string, serviceId: string, pathId: string) {
    return apiClient.patch<CablePathDto>(
      `/services/${serviceId}/cable-paths/${pathId}/rerouting`,
      {},
      token,
    );
  },

  decommission(token: string, serviceId: string, pathId: string) {
    return apiClient.patch<void>(
      `/services/${serviceId}/cable-paths/${pathId}/decommission`,
      {},
      token,
    );
  },
};
