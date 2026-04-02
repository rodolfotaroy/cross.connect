import type { CrossConnectOrderDto } from '@xc/types';
import type { CreateOrderInput } from '@xc/types/api';
import { apiClient } from './client';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const ordersApi = {
  list: (
    token: string,
    params?: { state?: string; orgId?: string; q?: string; page?: number; limit?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.orgId) qs.set('orgId', params.orgId);
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return apiClient.get<PaginatedResponse<CrossConnectOrderDto>>(
      `/orders${q ? `?${q}` : ''}`,
      token,
    );
  },

  getOne: (token: string, id: string) =>
    apiClient.get<CrossConnectOrderDto>(`/orders/${id}`, token),

  create: (token: string, data: CreateOrderInput) =>
    apiClient.post<CrossConnectOrderDto>('/orders', data, token),

  submit: (token: string, id: string) =>
    apiClient.patch<CrossConnectOrderDto>(`/orders/${id}/submit`, {}, token),

  approve: (token: string, id: string, notes?: string) =>
    apiClient.patch<CrossConnectOrderDto>(`/orders/${id}/approve`, { notes }, token),

  reject: (token: string, id: string, rejectionReason: string) =>
    apiClient.patch<CrossConnectOrderDto>(`/orders/${id}/reject`, { rejectionReason }, token),

  cancel: (token: string, id: string, cancelledReason?: string) =>
    apiClient.patch<CrossConnectOrderDto>(`/orders/${id}/cancel`, { cancelledReason }, token),
};

export const approvalsApi = {
  queue: (token: string) => apiClient.get<CrossConnectOrderDto[]>('/approvals/queue', token),
};
