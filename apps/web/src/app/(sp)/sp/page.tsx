import { PageHeader } from '@/components/ui/page-header';
import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { spReportsApi } from '@/lib/api/sp-reports';
import { spSupportApi } from '@/lib/api/sp-support';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard — SP Portal' };

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_progress: 'In Progress',
  completed: 'Completed',
  disconnected: 'Disconnected',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  disconnected: 'bg-gray-100 text-gray-400',
  cancelled: 'bg-red-100 text-red-600',
};

export default async function SpDashboard() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const canReport = role === 'super_admin' || role === 'sp_admin' || role === 'sp_report';

  const [xcResult, supportResult, summaryResult] = await Promise.all([
    dedicatedXcApi
      .list(token, { limit: 10, page: 1 })
      .catch(() => ({ data: [], meta: { total: 0 } })),
    spSupportApi
      .listTickets(token, { status: 'open', limit: 5 })
      .catch(() => ({ data: [], meta: { total: 0 } })),
    canReport ? spReportsApi.summary(token).catch(() => null) : Promise.resolve(null),
  ]);

  const recentXcs = xcResult.data;
  const totalXcs = xcResult.meta.total;
  const openTickets = supportResult.meta?.total ?? 0;
  const summary = summaryResult;

  const activeCount =
    summary?.byStatus?.find((s) => s.status === 'completed')?.count ??
    recentXcs.filter((x: any) => x.status === 'completed').length;
  const inProgressCount =
    summary?.byStatus?.find((s) => s.status === 'in_progress')?.count ??
    recentXcs.filter((x: any) => x.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Service Partner Portal overview" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Cross Connects" value={totalXcs} href="/sp/cross-connects" />
        <SummaryCard
          label="Completed"
          value={activeCount}
          href="/sp/cross-connects?status=completed"
          color="green"
        />
        <SummaryCard
          label="In Progress"
          value={inProgressCount}
          href="/sp/cross-connects?status=in_progress"
          color="orange"
        />
        <SummaryCard
          label="Open Tickets"
          value={openTickets}
          href="/sp/support"
          color={openTickets > 0 ? 'red' : undefined}
        />
      </div>

      {/* Financial summary — admin/report only */}
      {canReport && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Total MRC</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(Number(summary.totalMrc))}
            </p>
          </div>
        </div>
      )}

      {/* Recent cross connects */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Cross Connects</h2>
          <Link href="/sp/cross-connects" className="text-sm text-brand-600 hover:text-brand-700">
            View all →
          </Link>
        </div>
        {recentXcs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No cross connects yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'XC ID',
                    'Circuit ID',
                    'Status',
                    'Ordering Company',
                    'MRC',
                    'Date Completed',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentXcs.map((xc: any) => (
                  <tr key={xc.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 font-medium">
                      <Link
                        href={`/sp/cross-connects/${xc.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {xc.crossConnectId}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.circuitId ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[xc.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABEL[xc.status] ?? xc.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.orderingCompany ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.mrc ? formatCurrency(Number(xc.mrc)) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.dateCompleted ? new Date(xc.dateCompleted).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: number;
  href: string;
  color?: 'green' | 'orange' | 'red';
}) {
  const textColor =
    color === 'green'
      ? 'text-green-700'
      : color === 'orange'
        ? 'text-orange-600'
        : color === 'red'
          ? 'text-red-600'
          : 'text-gray-900';
  return (
    <Link
      href={href}
      className="rounded-lg border border-gray-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm"
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${textColor}`}>{value}</p>
    </Link>
  );
}

function formatCurrency(amount: number) {
  return `\xA5${Math.round(amount).toLocaleString('ja-JP')}`;
}
