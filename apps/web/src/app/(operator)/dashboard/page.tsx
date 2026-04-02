import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ordersApi } from '@/lib/api/cross-connects';
import { servicesApi } from '@/lib/api/services';
import { workOrdersApi } from '@/lib/api/work-orders';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [pendingResult, activeServicesResult, recentOrders, openWosResult] = await Promise.all([
    ordersApi
      .list(token, { state: 'pending_approval', limit: 10 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
    servicesApi
      .list(token, { state: 'active', limit: 1 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 1, total: 0, totalPages: 0 } })),
    ordersApi
      .list(token, { limit: 8 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 8, total: 0, totalPages: 0 } })),
    workOrdersApi
      .list(token, { limit: 50 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })),
  ]);

  const pendingApprovals = pendingResult.data;
  const activeServicesCount = activeServicesResult.meta.total;
  const openWoCount = openWosResult.data.filter(
    (wo) => !['completed', 'cancelled'].includes(wo.state),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals.length}
          href="/approvals"
          color="yellow"
        />
        <StatCard
          label="Active Services"
          value={activeServicesCount}
          href="/services?state=active"
          color="green"
        />
        <StatCard label="Open Work Orders" value={openWoCount} href="/work-orders" color="blue" />
        <StatCard
          label="Total Orders"
          value={recentOrders.meta.total}
          href="/orders"
          color="gray"
        />
      </div>

      {/* Pending approvals table */}
      {pendingApprovals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
            <Link href="/approvals" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
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
                      Customer
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
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingApprovals.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-brand-600">
                        <Link href={`/orders/${order.id}`}>{order.orderNumber}</Link>
                      </td>
                      <td className="px-4 py-3">{order.requestingOrgName}</td>
                      <td className="px-4 py-3 capitalize">
                        {order.serviceType.replace(/_/g, ' ')}
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
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <Link href="/orders" className="text-sm text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.data.length === 0 ? (
          <EmptyState title="No orders yet" />
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
                      Customer
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
                  {recentOrders.data.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-brand-600">
                        <Link href={`/orders/${order.id}`}>{order.orderNumber}</Link>
                      </td>
                      <td className="px-4 py-3">{order.requestingOrgName}</td>
                      <td className="px-4 py-3 capitalize text-xs">
                        <span className="inline-flex rounded-full px-2 py-0.5 bg-gray-100 text-gray-600">
                          {order.state.replace(/_/g, ' ')}
                        </span>
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
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  color,
}: {
  label: string;
  value: number;
  href: string;
  color: 'yellow' | 'blue' | 'green' | 'gray';
}) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    gray: 'bg-white border-gray-200 text-gray-700',
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
