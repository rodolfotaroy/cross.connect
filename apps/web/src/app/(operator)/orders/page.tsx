import { EmptyState } from '@/components/ui/empty-state';
import { OrderStateBadge } from '@/components/ui/status-badge';
import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import type { CrossConnectOrderDto } from '@xc/types';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string; page?: string; orgId?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Math.max(1, Number(sp.page ?? '1'));
  const ordersResult = await ordersApi
    .list(token, {
      state: sp.state || undefined,
      orgId: sp.orgId || undefined,
      q: sp.q || undefined,
      page,
      limit: 25,
    })
    .catch(() => ({
      data: [] as CrossConnectOrderDto[],
      meta: { page: 1, limit: 25, total: 0, totalPages: 0 },
    }));

  const meta = ordersResult.meta;

  function buildQs(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { state: sp.state, q: sp.q, orgId: sp.orgId, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Cross-Connect Orders</h1>
        <Link
          href="/orders/new"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
        >
          New Order
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search order number…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm w-52"
        />
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
        {sp.orgId && <input type="hidden" name="orgId" value={sp.orgId} />}
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Search
        </button>
        {(sp.state || sp.q) && (
          <a href="/orders" className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </a>
        )}
        <span className="ml-auto text-sm text-gray-500">
          {meta.total} order{meta.total !== 1 ? 's' : ''}
        </span>
      </form>

      {ordersResult.data.length === 0 ? (
        <EmptyState title="No orders found" description="Try adjusting your filters." />
      ) : (
        <div className="overflow-hidden rounded-lg shadow bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    Order #
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    Media
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordersResult.data.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">
                      <Link href={`/orders/${order.id}`} className="text-brand-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.requestingOrgName}</td>
                    <td className="px-4 py-3 capitalize">{order.serviceType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 uppercase">{order.mediaType}</td>
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
              href={`/orders${buildQs({ page: String(page - 1) })}`}
              className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← Prev
            </a>
          )}
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === meta.totalPages)
            .map((p, idx, arr) => (
              <>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span key={`ellipsis-${p}`} className="px-2 py-1 text-sm text-gray-400">
                    …
                  </span>
                )}
                <a
                  key={p}
                  href={`/orders${buildQs({ page: String(p) })}`}
                  className={`px-3 py-1 rounded-md text-sm border ${
                    p === page
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </a>
              </>
            ))}
          {page < meta.totalPages && (
            <a
              href={`/orders${buildQs({ page: String(page + 1) })}`}
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
