import { apiClient } from './client';
import type { PaginatedResponse } from './cross-connects';

export interface AuditEventDto {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  actorEmail: string | null;
  orderId: string | null;
  serviceId: string | null;
  diff: unknown;
  occurredAt: string;
  /** Populated when fetched via entity-specific endpoints. */
  actor?: { id: string; firstName: string; lastName: string; email?: string | null } | null;
}

export const auditApi = {
  list(
    token: string,
    params?: {
      entityType?: string;
      action?: string;
      actorId?: string;
      orderId?: string;
      serviceId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const qs = new URLSearchParams();
    if (params?.entityType) qs.set('entityType', params.entityType);
    if (params?.action) qs.set('action', params.action);
    if (params?.actorId) qs.set('actorId', params.actorId);
    if (params?.orderId) qs.set('orderId', params.orderId);
    if (params?.serviceId) qs.set('serviceId', params.serviceId);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<AuditEventDto>>(`/audit?${qs}`, token);
  },

  listForOrder(token: string, orderId: string) {
    return apiClient.get<AuditEventDto[]>(`/audit/orders/${orderId}`, token);
  },
};
