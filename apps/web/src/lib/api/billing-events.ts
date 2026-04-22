import { apiClient } from './client';

export interface BillingTriggerEventDto {
  id: string;
  serviceId: string;
  service: { id: string; serviceNumber: string } | null;
  eventType: string;
  occurredAt: string;
  exportedAt: string | null;
  mrcCents: number | null;
  nrcCents: number | null;
}

export interface BillingEventPage {
  data: BillingTriggerEventDto[];
  nextCursor: string | null;
}

export const billingEventsApi = {
  listPending(token: string) {
    return apiClient.get<BillingEventPage>('/billing-events/pending', token);
  },
};
