import { DedicatedXcStatusBadge } from '@/components/ui/dedicated-xc-status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { spReportsApi } from '@/lib/api/sp-reports';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Reports — SP Portal' };

export default async function SpReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    year?: string;
    quarter?: string;
    company?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Number(sp.page ?? '1');
  const filters = {
    status: sp.status as any,
    year: sp.year ? Number(sp.year) : undefined,
    quarter: sp.quarter ? Number(sp.quarter) : undefined,
    orderingCompany: sp.company,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    page,
    limit: 50,
  };

  const [summary, result] = await Promise.all([
    spReportsApi.summary(token).catch(() => null),
    spReportsApi
      .list(token, filters)
      .catch(() => ({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })),
  ]);

  // Query string for pagination links (preserves form field names)
  const pageQs = new URLSearchParams();
  if (sp.status) pageQs.set('status', sp.status);
  if (sp.year) pageQs.set('year', sp.year);
  if (sp.quarter) pageQs.set('quarter', sp.quarter);
  if (sp.company) pageQs.set('company', sp.company);
  if (sp.dateFrom) pageQs.set('dateFrom', sp.dateFrom);
  if (sp.dateTo) pageQs.set('dateTo', sp.dateTo);

  // Query string for CSV export (maps to API param names)
  const exportQs = new URLSearchParams();
  if (sp.status) exportQs.set('status', sp.status);
  if (sp.year) exportQs.set('year', sp.year);
  if (sp.quarter) exportQs.set('quarter', sp.quarter);
  if (sp.company) exportQs.set('orderingCompany', sp.company);
  if (sp.dateFrom) exportQs.set('dateFrom', sp.dateFrom);
  if (sp.dateTo) exportQs.set('dateTo', sp.dateTo);
  const exportHref = `/api/sp/export${exportQs.toString() ? `?${exportQs}` : ''}`;

  const totalMrc = Number(summary?.totalMrc ?? 0);
  const totalNrc = Number(summary?.totalNrc ?? 0);
  const arr = totalMrc * 12;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Cross-connect financial reporting &amp; analytics"
        actions={
          <a
            href={exportHref}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            download
          >
            Export CSV
          </a>
        }
      />

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Records" value={result.meta.total} />
          <SummaryCard label="Total MRC" value={`$${totalMrc.toFixed(2)}`} />
          <SummaryCard label="Total NRC" value={`$${totalNrc.toFixed(2)}`} />
          <SummaryCard label="Annual Recurring Revenue" value={`$${arr.toFixed(2)}`} />
        </div>
      )}

      {/* Financial Breakdowns */}
      {summary && (summary.byStatus.length > 0 || summary.byQuarter.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summary.byStatus.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Status Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.byStatus.map((s) => (
                    <tr key={s.status}>
                      <td className="py-1.5 capitalize">{s.status.replace(/_/g, ' ')}</td>
                      <td className="py-1.5 text-right font-medium">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {summary.byQuarter.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Revenue by Quarter</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2">Period</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">MRC</th>
                    <th className="pb-2 text-right">NRC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.byQuarter.map((q) => (
                    <tr key={`${q.year}-${q.quarter}`}>
                      <td className="py-1.5">
                        {q.year} Q{q.quarter}
                      </td>
                      <td className="py-1.5 text-right">{q.count}</td>
                      <td className="py-1.5 text-right">${Number(q.totalMrc).toFixed(2)}</td>
                      <td className="py-1.5 text-right">${Number(q.totalNrc).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            name="status"
            defaultValue={sp.status ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disconnected">Disconnected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Company</label>
          <input
            name="company"
            type="text"
            defaultValue={sp.company ?? ''}
            placeholder="Ordering company"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input
            name="dateFrom"
            type="date"
            defaultValue={sp.dateFrom ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">To</label>
          <input
            name="dateTo"
            type="date"
            defaultValue={sp.dateTo ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Year</label>
          <input
            name="year"
            type="number"
            defaultValue={sp.year ?? ''}
            placeholder="e.g. 2025"
            className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Quarter</label>
          <select
            name="quarter"
            defaultValue={sp.quarter ?? ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All quarters</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Apply
        </button>
        <a
          href="/sp/reports"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Clear
        </a>
      </form>

      {/* Results table */}
      {result.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No records match the selected filters
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'XC ID',
                    'Circuit ID',
                    'Status',
                    'Ordering Company',
                    'Bandwidth',
                    'MRC',
                    'NRC',
                    'Billable Date',
                    'Year / Q',
                    'Completed',
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {result.data.map((xc: any) => (
                  <tr key={xc.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      <Link
                        href={`/sp/cross-connects/${xc.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {xc.crossConnectId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.circuitId ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <DedicatedXcStatusBadge status={xc.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.orderingCompany ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.bandwidth ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.mrc ? `$${Number(xc.mrc).toFixed(2)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.nrc ? `$${Number(xc.nrc).toFixed(2)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.billableDate ? new Date(xc.billableDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.year ? `${xc.year} Q${xc.quarter ?? '—'}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {xc.dateCompleted ? new Date(xc.dateCompleted).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm text-gray-600">
              <span>
                Page {result.meta.page} of {result.meta.totalPages}
              </span>
              <div className="flex gap-2">
                {result.meta.page > 1 && (
                  <Link
                    href={`?page=${result.meta.page - 1}&${pageQs}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {result.meta.page < result.meta.totalPages && (
                  <Link
                    href={`?page=${result.meta.page + 1}&${pageQs}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
