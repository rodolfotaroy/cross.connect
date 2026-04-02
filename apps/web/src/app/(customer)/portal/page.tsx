import { PageHeader } from '@/components/ui/page-header';
import { OrderStateBadge } from '@/components/ui/status-badge';
import { ordersApi } from '@/lib/api/cross-connects';
import { servicesApi } from '@/lib/api/services';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'My Portal' };

export default async function CustomerPortalPage() {
  const session = await auth();
  const user = session?.user as any;
  const token = user?.accessToken as string;
  const canPlaceOrders = ['customer_admin', 'customer_orderer'].includes(user?.role);

  const [ordersResult, activeServicesResult] = await Promise.all([
    ordersApi
      .list(token, { limit: 6 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 6, total: 0, totalPages: 0 } })),
    servicesApi
      .list(token, { state: 'active', limit: 1 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 0 } })),
  ]);

  const orders = ordersResult.data;
  const pendingCount = orders.filter((o) =>
    ['submitted', 'under_review', 'pending_approval'].includes(o.state),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Portal"
        actions={
          canPlaceOrders ? (
            <Link
              href="/portal/orders/new"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Request Cross-Connect
            </Link>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active Services"
          value={activeServicesResult.meta.total}
          href="/portal/services"
          color="green"
        />
        <SummaryCard
          label="In-Progress Orders"
          value={pendingCount}
          href="/portal/orders"
          color="yellow"
        />
        <SummaryCard
          label="Total Orders"
          value={ordersResult.meta.total}
          href="/portal/orders"
          color="blue"
        />
      </div>

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <Link href="/portal/orders" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
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
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    {canPlaceOrders ? (
                      <>
                        No orders yet —{' '}
                        <Link href="/portal/orders/new" className="text-brand-600 hover:underline">
                          request your first cross-connect
                        </Link>
                      </>
                    ) : (
                      'No orders have been placed for your account yet.'
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
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
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
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
  color: 'green' | 'yellow' | 'blue';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-5 hover:shadow-sm transition-shadow ${colors[color]}`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </Link>
  );
}
