import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import { auditApi, type AuditEventDto } from '@/lib/api/audit';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';

const ACTION_VARIANTS: Record<string, 'info' | 'success' | 'warn' | 'danger' | 'neutral'> = {
  created: 'success',
  updated: 'info',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  activated: 'success',
  disconnected: 'neutral',
  suspended: 'warn',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    entityType?: string;
    action?: string;
    orderId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Number(sp.page ?? '1');

  const result = await auditApi
    .list(token, {
      page,
      limit: 50,
      entityType: sp.entityType,
      action: sp.action,
      orderId: sp.orderId,
      from: sp.from,
      to: sp.to,
    })
    .catch(() => ({
      data: [] as AuditEventDto[],
      meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    }));

  return (
    <div>
      <PageHeader title="Audit Log" subtitle={`${result.meta.total} total events`} />

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <input
          name="entityType"
          defaultValue={sp.entityType}
          placeholder="Entity type…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="action"
          defaultValue={sp.action}
          placeholder="Action…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="orderId"
          defaultValue={sp.orderId}
          placeholder="Order ID…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="from"
          defaultValue={sp.from}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="to"
          defaultValue={sp.to}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
        {Object.values(sp).some(Boolean) && (
          <Link
            href="/audit"
            className="rounded-md px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </Link>
        )}
      </form>

      {result.data.length === 0 ? (
        <EmptyState title="No audit events found" description="Try adjusting your filters." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    When
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Actor
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Entity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Action
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Ref
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.data.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(evt.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 max-w-[180px] text-gray-700">
                      <span
                        className="font-mono text-xs block truncate"
                        title={evt.actorEmail ?? evt.actorId}
                      >
                        {evt.actorEmail ?? evt.actorId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Badge label={evt.entityType} variant="neutral" />
                      <span className="ml-2 font-mono text-xs text-gray-400">
                        {evt.entityId.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        label={evt.action}
                        variant={ACTION_VARIANTS[evt.action] ?? 'neutral'}
                      />
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {evt.orderId && (
                        <Link
                          href={`/orders/${evt.orderId}`}
                          className="text-brand-600 hover:underline font-mono"
                        >
                          {evt.orderId.slice(0, 8)}…
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.meta.total > result.meta.limit && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm text-gray-600">
              <span>
                Showing {(result.meta.page - 1) * result.meta.limit + 1}–
                {Math.min(result.meta.page * result.meta.limit, result.meta.total)} of{' '}
                {result.meta.total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {result.meta.total > page * result.meta.limit && (
                  <Link
                    href={`?page=${page + 1}`}
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
