import { DedicatedXcStatusBadge } from '@/components/ui/dedicated-xc-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cross Connects — SP Portal' };

export default async function SpCrossConnectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const canWrite = role === 'super_admin' || role === 'sp_admin' || role === 'sp_ops';

  const page = Number(sp.page ?? '1');
  const result = await dedicatedXcApi
    .list(token, { page, limit: 25, status: sp.status as any, q: sp.q })
    .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross Connects"
        subtitle={`${result.meta.total} record${result.meta.total !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={sp.q ?? ''}
          placeholder="Search by XC ID or Circuit ID…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
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
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
        <a
          href="/sp/cross-connects"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Clear
        </a>
        {canWrite && (
          <Link
            href="/sp/cross-connects/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            New Cross Connect
          </Link>
        )}
      </form>

      {result.data.length === 0 ? (
        <EmptyState
          title="No cross connects found"
          description={
            sp.status || sp.q
              ? 'Try adjusting your filters.'
              : 'Create your first cross connect to get started.'
          }
        />
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
                    'Site',
                    'MRC',
                    'NRC',
                    'Date Completed',
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {result.data.map((xc: any) => (
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
                      <DedicatedXcStatusBadge status={xc.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.orderingCompany ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.site?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.mrc ? `¥${Math.round(Number(xc.mrc)).toLocaleString()}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {xc.nrc ? `¥${Math.round(Number(xc.nrc)).toLocaleString()}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
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
                    href={`?page=${result.meta.page - 1}${sp.status ? `&status=${sp.status}` : ''}${sp.q ? `&q=${sp.q}` : ''}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {result.meta.page < result.meta.totalPages && (
                  <Link
                    href={`?page=${result.meta.page + 1}${sp.status ? `&status=${sp.status}` : ''}${sp.q ? `&q=${sp.q}` : ''}`}
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
