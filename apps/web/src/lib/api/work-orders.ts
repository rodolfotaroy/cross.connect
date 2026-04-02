import type { DocumentDto, WorkOrderDto } from '@xc/types';
import { apiClient } from './client';
import type { PaginatedResponse } from './cross-connects';

/** Extended DTO returned by GET /work-orders/:id (includes populated relations). */
export interface WorkOrderDetailDto extends WorkOrderDto {
  assignedTo: { id: string; firstName: string; lastName: string; email: string } | null;
  service: { id: string; serviceNumber: string } | null;
  cablePath: {
    id: string;
    pathRole: string | null;
    state: string;
    segments: Array<{
      id: string;
      sequence: number;
      fromPortId: string;
      toPortId: string;
      segmentType: string;
      physicalCableLabel: string | null;
      fromPort: { id: string; label: string } | null;
      toPort: { id: string; label: string } | null;
    }>;
  } | null;
  documents: DocumentDto[];
  auditEvents: Array<{
    id: string;
    action: string;
    occurredAt: string;
    actor: { id: string; firstName: string; lastName: string } | null;
  }>;
}

export const workOrdersApi = {
  list(
    token: string,
    params?: {
      state?: string;
      woType?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const qs = new URLSearchParams();
    if (params?.state) qs.set('state', params.state);
    if (params?.woType) qs.set('woType', params.woType);
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<WorkOrderDto>>(`/work-orders?${qs}`, token);
  },

  getOne(token: string, id: string) {
    return apiClient.get<WorkOrderDetailDto>(`/work-orders/${id}`, token);
  },

  create(token: string, dto: { serviceId: string; woType: string; notes?: string }) {
    return apiClient.post<WorkOrderDto>('/work-orders', dto, token);
  },
};
