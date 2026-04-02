import type { OrganizationDto, OrgType, UserDto } from '@xc/types';
import { apiClient } from './client';
export type { OrganizationDto, UserDto };

import type { PaginatedResponse } from './cross-connects';
export type { PaginatedResponse as PaginatedOrganizations };

export interface CreateOrganizationInput {
  name: string;
  code: string;
  orgType: OrgType;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
}

export const orgsApi = {
  list(
    token: string,
    params?: { page?: number; limit?: number; orgType?: OrgType; search?: string },
  ) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.orgType) qs.set('orgType', params.orgType);
    if (params?.search) qs.set('q', params.search);
    return apiClient.get<PaginatedResponse<OrganizationDto>>(`/organizations?${qs}`, token);
  },

  getOne(token: string, id: string) {
    return apiClient.get<OrganizationDto>(`/organizations/${id}`, token);
  },

  create(token: string, dto: CreateOrganizationInput) {
    return apiClient.post<OrganizationDto>('/organizations', dto, token);
  },

  update(token: string, id: string, dto: UpdateOrganizationInput) {
    return apiClient.patch<OrganizationDto>(`/organizations/${id}`, dto, token);
  },

  deactivate(token: string, id: string) {
    return apiClient.patch<OrganizationDto>(`/organizations/${id}/deactivate`, {}, token);
  },

  listUsers(token: string, orgId: string) {
    return apiClient.get<UserDto[]>(`/organizations/${orgId}/users`, token);
  },

  getUser(token: string, userId: string) {
    return apiClient.get<UserDto>(`/organizations/users/${userId}`, token);
  },

  createUser(token: string, orgId: string, dto: CreateUserInput) {
    return apiClient.post<UserDto>(`/organizations/${orgId}/users`, dto, token);
  },

  updateUserRole(token: string, userId: string, role: string) {
    return apiClient.patch<UserDto>(`/organizations/users/${userId}/role`, { role }, token);
  },

  deactivateUser(token: string, userId: string) {
    return apiClient.patch<UserDto>(`/organizations/users/${userId}/deactivate`, {}, token);
  },

  reactivateUser(token: string, userId: string) {
    return apiClient.patch<UserDto>(`/organizations/users/${userId}/reactivate`, {}, token);
  },
};
