import type { UserDto } from '@xc/types';
import type { CreateSpUserInput, UpdateSpUserInput } from '@xc/types/api';
import { apiClient } from './client';

export const spTeamApi = {
  list(token: string) {
    return apiClient.get<UserDto[]>('/sp/team', token);
  },

  getOne(token: string, userId: string) {
    return apiClient.get<UserDto>(`/sp/team/${userId}`, token);
  },

  create(token: string, data: CreateSpUserInput) {
    return apiClient.post<UserDto>('/sp/team', data, token);
  },

  update(token: string, userId: string, data: UpdateSpUserInput) {
    return apiClient.patch<UserDto>(`/sp/team/${userId}`, data, token);
  },

  deactivate(token: string, userId: string) {
    return apiClient.patch<UserDto>(`/sp/team/${userId}/deactivate`, {}, token);
  },

  reactivate(token: string, userId: string) {
    return apiClient.patch<UserDto>(`/sp/team/${userId}/reactivate`, {}, token);
  },
};
