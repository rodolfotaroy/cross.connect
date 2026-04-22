import { PageHeader } from '@/components/ui/page-header';
import { opSupportApi } from '@/lib/api/op-support';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Support — Operator Portal' };

const TICKET_STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PORTAL_BADGE: Record<string, string> = {
  sp: 'bg-purple-100 text-purple-700',
  op: 'bg-blue-100 text-blue-700',
};

export default async function OpSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Number(sp.page ?? '1');

  const result = await opSupportApi
    .listTickets(token, { status: sp.status as any, page, limit: 25 })
    .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        subtitle="All support tickets across all organizations and portals"
        actions={
          <Link
            href="/support/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New Ticket
          </Link>
        }
      />

      {/* Filter */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
      </form>

      {/* Ticket list */}
      {result.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No tickets found
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Ticket #', 'Organization', 'Subject', 'Portal', 'Priority', 'Status', 'Created'].map((h) => (
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
              <tbody className="divide-y divide-gray-200">
                {result.data.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 font-mono font-medium">
                      <Link href={`/support/${t.id}`} className="text-brand-600 hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {t.organization?.name ?? t.organizationId.slice(0, 8) + '…'}
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-gray-900">
                      {t.subject}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PORTAL_BADGE[t.portal] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {(t.portal ?? 'sp').toUpperCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[t.priority] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm">
              <span className="text-gray-500">
                Page {result.meta.page} of {result.meta.totalPages} · {result.meta.total} total
              </span>
              <div className="flex gap-2">
                {result.meta.page > 1 && (
                  <Link
                    href={`?page=${result.meta.page - 1}${sp.status ? `&status=${sp.status}` : ''}`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50"
                  >
                    ← Prev
                  </Link>
                )}
                {result.meta.page < result.meta.totalPages && (
                  <Link
                    href={`?page=${result.meta.page + 1}${sp.status ? `&status=${sp.status}` : ''}`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50"
                  >
                    Next →
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
