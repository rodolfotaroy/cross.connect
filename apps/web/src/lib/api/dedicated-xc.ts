import type {
  AddDedicatedXcHopInput,
  CreateDedicatedXcInput,
  ListDedicatedXcInput,
  UpdateDedicatedXcInput,
} from '@xc/types/api';
import { apiClient } from './client';

export interface DedicatedXcHopDto {
  id: string;
  hopNumber: number;
  room: string | null;
  rack: string | null;
  device: string | null;
  port: string | null;
}

export interface DedicatedXcDto {
  id: string;
  crossConnectId: string;
  circuitId: string | null;
  ticketNumber: string | null;
  salesSource: string | null;
  nrc: string | null;
  mrc: string | null;
  serviceId: string | null;
  status: string;
  testReport: string | null;
  siteId: string | null;
  site: { id: string; name: string; code: string } | null;
  dateCompleted: string | null;
  year: number | null;
  quarter: number | null;
  billableDate: string | null;
  disconnectionDate: string | null;
  requestedDisconnectionDate: string | null;
  orderingCompany: string | null;
  aEndCampus: string | null;
  aEndBuilding: string | null;
  aEndFloor: string | null;
  aEndRoom: string | null;
  aEndRack: string | null;
  aEndDevice: string | null;
  aEndPort: string | null;
  zEndCampus: string | null;
  zEndBuilding: string | null;
  zEndFloor: string | null;
  zEndRoom: string | null;
  zEndRack: string | null;
  zEndDevice: string | null;
  zEndPort: string | null;
  customerType: string | null;
  cableType: string | null;
  notes: string | null;
  hops: DedicatedXcHopDto[];
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedXcResponse {
  data: DedicatedXcDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const dedicatedXcApi = {
  list(token: string, params?: Partial<ListDedicatedXcInput>) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.year) qs.set('year', String(params.year));
    if (params?.quarter) qs.set('quarter', String(params.quarter));
    if ((params as any)?.sortBy) qs.set('sortBy', (params as any).sortBy);
    if ((params as any)?.sortDir) qs.set('sortDir', (params as any).sortDir);
    const q = qs.toString();
    return apiClient.get<PaginatedXcResponse>(`/sp/cross-connects${q ? `?${q}` : ''}`, token);
  },

  getOne(token: string, id: string) {
    return apiClient.get<DedicatedXcDto>(`/sp/cross-connects/${id}`, token);
  },

  create(token: string, data: CreateDedicatedXcInput) {
    return apiClient.post<DedicatedXcDto>('/sp/cross-connects', data, token);
  },

  update(token: string, id: string, data: UpdateDedicatedXcInput) {
    return apiClient.patch<DedicatedXcDto>(`/sp/cross-connects/${id}`, data, token);
  },

  remove(token: string, id: string) {
    return apiClient.delete<void>(`/sp/cross-connects/${id}`, token);
  },

  addHop(token: string, xcId: string, data: AddDedicatedXcHopInput) {
    return apiClient.post<DedicatedXcHopDto>(`/sp/cross-connects/${xcId}/hops`, data, token);
  },

  removeHop(token: string, xcId: string, hopId: string) {
    return apiClient.delete<void>(`/sp/cross-connects/${xcId}/hops/${hopId}`, token);
  },
};
