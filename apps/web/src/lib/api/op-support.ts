import type {
  CreateSupportTicketInput,
  CreateTicketCommentInput,
  ListSupportTicketsInput,
  UpdateTicketStatusInput,
} from '@xc/types/api';
import { apiClient } from './client';

export interface TicketCommentDto {
  id: string;
  body: string;
  authorId: string;
  author: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

export interface SupportTicketDto {
  id: string;
  ticketNumber: string;
  portal: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  organizationId: string;
  organization?: { id: string; name: string; code: string };
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  resolvedById: string | null;
  resolvedBy: { id: string; firstName: string; lastName: string } | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  comments?: TicketCommentDto[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpTicketInput extends CreateSupportTicketInput {
  orgId: string;
}

export const opSupportApi = {
  listTickets(token: string, params?: Partial<ListSupportTicketsInput>) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const q = qs.toString();
    return apiClient.get<{ data: SupportTicketDto[]; meta: any }>(
      `/op/support/tickets${q ? `?${q}` : ''}`,
      token,
    );
  },

  getTicket(token: string, id: string) {
    return apiClient.get<SupportTicketDto>(`/op/support/tickets/${id}`, token);
  },

  createTicket(token: string, data: CreateOpTicketInput) {
    return apiClient.post<SupportTicketDto>('/op/support/tickets', data, token);
  },

  updateStatus(token: string, id: string, data: UpdateTicketStatusInput) {
    return apiClient.patch<SupportTicketDto>(`/op/support/tickets/${id}/status`, data, token);
  },

  addComment(token: string, id: string, data: CreateTicketCommentInput) {
    return apiClient.post<TicketCommentDto>(`/op/support/tickets/${id}/comments`, data, token);
  },
};
