import type { ListReportsInput } from '@xc/types/api';
import { apiClient } from './client';

export interface ReportSummaryDto {
  total: number;
  totalNrc: number | string;
  totalMrc: number | string;
  byStatus: { status: string; count: number }[];
  byQuarter: {
    year: number | null;
    quarter: number | null;
    count: number;
    totalMrc: number | string;
    totalNrc: number | string;
  }[];
}

export const spReportsApi = {
  summary(token: string) {
    return apiClient.get<ReportSummaryDto>('/sp/reports/summary', token);
  },

  list(token: string, params?: Partial<ListReportsInput>) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.year) qs.set('year', String(params.year));
    if (params?.quarter) qs.set('quarter', String(params.quarter));
    if (params?.status) qs.set('status', params.status);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    if (params?.orderingCompany) qs.set('orderingCompany', params.orderingCompany);
    if (params?.customerType) qs.set('customerType', params.customerType);
    const q = qs.toString();
    return apiClient.get<any>(`/sp/reports/cross-connects${q ? `?${q}` : ''}`, token);
  },

  exportUrl(params?: Partial<ListReportsInput>): string {
    const qs = new URLSearchParams();
    if (params?.year) qs.set('year', String(params.year));
    if (params?.quarter) qs.set('quarter', String(params.quarter));
    if (params?.status) qs.set('status', params.status ?? '');
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    if (params?.orderingCompany) qs.set('orderingCompany', params.orderingCompany);
    if (params?.customerType) qs.set('customerType', params.customerType);
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';
    const q = qs.toString();
    return `${base}/api/v1/sp/reports/cross-connects/export${q ? `?${q}` : ''}`;
  },
};
