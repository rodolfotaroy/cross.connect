import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, WorkOrderStateBadge } from '@/components/ui/status-badge';
import { workOrdersApi } from '@/lib/api/work-orders';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string; type?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Number(sp.page ?? '1');

  const result = await workOrdersApi
    .list(token, { page, limit: 25, state: sp.state, woType: sp.type, q: sp.q })
    .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));

  return (
    <div>
      <PageHeader title="Work Orders" subtitle={`${result.meta.total} total`} />

      {/* Filters */}
      <form method="GET" className="mb-6 flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search WO number…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm w-48"
        />
        <select
          name="state"
          defaultValue={sp.state ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          <option value="created">Created</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="pending_test">Pending Test</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="install">Install</option>
          <option value="disconnect">Disconnect</option>
          <option value="reroute">Reroute</option>
          <option value="repair">Repair</option>
          <option value="audit_check">Audit Check</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
      </form>

      {result.data.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description="Work orders are created when cross-connect orders are approved."
        />
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
                    WO #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Service
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Assigned To
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Created
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.data.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{wo.woNumber}</td>
                    <td className="px-6 py-4">
                      <Badge label={wo.woType.replace(/_/g, ' ')} variant="info" />
                    </td>
                    <td className="px-6 py-4">
                      <WorkOrderStateBadge state={wo.state} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      <a
                        href={`/services/${wo.serviceId}`}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {wo.serviceId.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {wo.assignedToName ??
                        (wo.assignedToId ? (
                          <span className="font-mono text-xs">{wo.assignedToId.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        ))}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/work-orders/${wo.id}`}
                        className="text-brand-600 hover:underline text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
