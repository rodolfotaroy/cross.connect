import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { OrderStateBadge } from '@/components/ui/status-badge';
import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import type { CrossConnectOrderDto } from '@xc/types';
import Link from 'next/link';

export default async function ApprovalsPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  // Fetch all orders needing operator attention across the full workflow
  const [submitted, underReview, pendingApproval] = await Promise.all([
    ordersApi
      .list(token, { state: 'submitted', limit: 50 })
      .catch(() => ({ data: [] as CrossConnectOrderDto[] })),
    ordersApi
      .list(token, { state: 'under_review', limit: 50 })
      .catch(() => ({ data: [] as CrossConnectOrderDto[] })),
    ordersApi
      .list(token, { state: 'pending_approval', limit: 50 })
      .catch(() => ({ data: [] as CrossConnectOrderDto[] })),
  ]);
  const queue: CrossConnectOrderDto[] = [
    ...pendingApproval.data,
    ...underReview.data,
    ...submitted.data,
  ];

  return (
    <div>
      <PageHeader
        title="Work Queue"
        subtitle={`${queue.length} order${queue.length !== 1 ? 's' : ''} needing attention`}
      />

      {queue.length === 0 ? (
        <EmptyState
          title="Approval queue is empty"
          description="All orders have been reviewed. Check back later."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Media
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    State
                  </th>
                  <th className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.map((order) => (
                  <tr key={order.id} className="hover:bg-yellow-50">
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      <Link href={`/orders/${order.id}`} className="text-brand-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{order.requestingOrgName}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {order.serviceType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 uppercase text-gray-600">{order.mediaType}</td>
                    <td className="px-6 py-4">
                      <OrderStateBadge state={order.state} />
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
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
