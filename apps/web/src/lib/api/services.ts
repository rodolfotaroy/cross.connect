import type {
  CrossConnectServiceDto,
  DisconnectServiceInput,
  ExtendTemporaryServiceInput,
  SuspendServiceInput,
} from '@xc/types';
import { apiClient } from './client';
import type { PaginatedResponse } from './cross-connects';

export const servicesApi = {
  list(
    token: string,
    params?: {
      state?: string;
      orgId?: string;
      serviceType?: string;
      isTemporary?: boolean;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.orgId) qs.set('orgId', params.orgId);
    if (params?.serviceType) qs.set('serviceType', params.serviceType);
    if (params?.isTemporary !== undefined) qs.set('isTemporary', String(params.isTemporary));
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return apiClient.get<PaginatedResponse<CrossConnectServiceDto>>(
      `/services${q ? `?${q}` : ''}`,
      token,
    );
  },

  getOne(token: string, id: string) {
    return apiClient.get<CrossConnectServiceDto>(`/services/${id}`, token);
  },

  disconnect(token: string, id: string, dto: DisconnectServiceInput) {
    return apiClient.patch<CrossConnectServiceDto>(`/services/${id}/disconnect`, dto, token);
  },

  abortProvisioning(token: string, id: string, dto: { reason: string }) {
    return apiClient.patch<CrossConnectServiceDto>(
      `/services/${id}/abort-provisioning`,
      dto,
      token,
    );
  },

  suspend(token: string, id: string, dto: SuspendServiceInput) {
    return apiClient.patch<CrossConnectServiceDto>(`/services/${id}/suspend`, dto, token);
  },

  resume(token: string, id: string) {
    return apiClient.patch<CrossConnectServiceDto>(`/services/${id}/resume`, {}, token);
  },

  extend(token: string, id: string, dto: ExtendTemporaryServiceInput) {
    return apiClient.patch<CrossConnectServiceDto>(`/services/${id}/extend`, dto, token);
  },
};
