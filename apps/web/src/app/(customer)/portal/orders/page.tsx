import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { OrderStateBadge } from '@/components/ui/status-badge';
import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import type { CrossConnectOrderDto } from '@xc/types';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'My Orders' };

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const canPlaceOrders = ['customer_admin', 'customer_orderer'].includes(role);

  const page = Math.max(1, Number(sp.page ?? '1'));
  const ordersResult = await ordersApi
    .list(token, { state: sp.state || undefined, page, limit: 20 })
    .catch(() => ({
      data: [] as CrossConnectOrderDto[],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }));

  const meta = ordersResult.meta;

  function buildQs(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { state: sp.state, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Cross-Connect Requests"
        subtitle={`${meta.total} order${meta.total !== 1 ? 's' : ''}`}
        actions={
          canPlaceOrders ? (
            <Link
              href="/portal/orders/new"
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
            >
              Request New
            </Link>
          ) : undefined
        }
      />

      {/* State filter */}
      <form method="GET" className="flex gap-2 items-center">
        <label htmlFor="filter-state" className="sr-only">
          Filter by state
        </label>
        <select
          id="filter-state"
          name="state"
          defaultValue={sp.state ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
        {sp.state && (
          <a href="/portal/orders" className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </a>
        )}
      </form>

      {ordersResult.data.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={sp.state ? 'Try clearing the state filter.' : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg shadow bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Order #
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Requested
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordersResult.data.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-brand-600">
                      <Link href={`/portal/orders/${order.id}`} className="hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{order.serviceType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <OrderStateBadge state={order.state} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/portal/orders${buildQs({ page: String(page - 1) })}`}
              className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← Prev
            </a>
          )}
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/portal/orders${buildQs({ page: String(p) })}`}
              className={`px-3 py-1 rounded-md text-sm border ${
                p === page
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </a>
          ))}
          {page < meta.totalPages && (
            <a
              href={`/portal/orders${buildQs({ page: String(page + 1) })}`}
              className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
