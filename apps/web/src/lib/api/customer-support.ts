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

export interface CustomerSupportTicketDto {
  id: string;
  ticketNumber: string;
  portal: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  organizationId: string;
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

export interface ContactDetailsDto {
  name: string;
  email: string;
  phone: string | null;
  hours: string;
}

export const customerSupportApi = {
  getContact(token: string) {
    return apiClient.get<ContactDetailsDto>('/portal/support/contact', token);
  },

  listTickets(token: string, params?: Partial<ListSupportTicketsInput>) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const q = qs.toString();
    return apiClient.get<{ data: CustomerSupportTicketDto[]; meta: any }>(
      `/portal/support/tickets${q ? `?${q}` : ''}`,
      token,
    );
  },

  getTicket(token: string, id: string) {
    return apiClient.get<CustomerSupportTicketDto>(`/portal/support/tickets/${id}`, token);
  },

  createTicket(token: string, dto: CreateSupportTicketInput) {
    return apiClient.post<CustomerSupportTicketDto>('/portal/support/tickets', dto, token);
  },

  updateStatus(token: string, id: string, dto: UpdateTicketStatusInput) {
    return apiClient.patch<CustomerSupportTicketDto>(
      `/portal/support/tickets/${id}/status`,
      dto,
      token,
    );
  },

  addComment(token: string, id: string, dto: CreateTicketCommentInput) {
    return apiClient.post<TicketCommentDto>(
      `/portal/support/tickets/${id}/comments`,
      dto,
      token,
    );
  },
};
