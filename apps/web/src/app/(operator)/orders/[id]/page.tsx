import { DetailSection } from '@/components/ui/detail-section';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, OrderStateBadge } from '@/components/ui/status-badge';
import { auditApi, type AuditEventDto } from '@/lib/api/audit';
import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { CreateWorkOrderButton } from './create-work-order-button';
import { OrderActions } from './order-actions';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [order, auditEvents] = await Promise.all([
    ordersApi.getOne(token, id).catch(() => null),
    auditApi.listForOrder(token, id).catch(() => [] as AuditEventDto[]),
  ]);
  if (!order) notFound();

  const raw = order as any;
  const submittedByName = raw.submittedBy?.firstName
    ? `${raw.submittedBy.firstName} ${raw.submittedBy.lastName}`
    : order.submittedById.slice(0, 8) + '…';
  const approvedByName = raw.approvedBy?.firstName
    ? `${raw.approvedBy.firstName} ${raw.approvedBy.lastName}`
    : order.approvedById
      ? order.approvedById.slice(0, 8) + '…'
      : null;
  const serviceId: string | null = raw.service?.id ?? null;

  const role = (session?.user as any)?.role as string;
  const canAct = ['super_admin', 'ops_manager', 'ops_technician'].includes(role);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        subtitle={`${order.serviceType.replace(/_/g, ' ')} · ${order.mediaType.toUpperCase()}`}
        breadcrumb={[{ label: 'Orders', href: '/orders' }, { label: order.orderNumber }]}
        actions={<OrderStateBadge state={order.state} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — order details */}
        <div className="space-y-6 lg:col-span-2">
          <DetailSection
            title="Order Details"
            rows={[
              {
                label: 'Order Number',
                value: <span className="font-mono font-semibold">{order.orderNumber}</span>,
              },
              { label: 'State', value: <OrderStateBadge state={order.state} /> },
              { label: 'Service Type', value: order.serviceType.replace(/_/g, ' ') },
              {
                label: 'Media Type',
                value: <span className="uppercase font-mono">{order.mediaType}</span>,
              },
              { label: 'Speed', value: order.speedGbps ? `${order.speedGbps} Gbps` : null },
              {
                label: 'Temporary',
                value: order.isTemporary ? <Badge label="Yes — temporary" variant="warn" /> : 'No',
              },
              {
                label: 'Requested Active',
                value: order.requestedActiveAt
                  ? new Date(order.requestedActiveAt).toLocaleString()
                  : null,
              },
              {
                label: 'Expires At',
                value: order.expiresAt ? new Date(order.expiresAt).toLocaleString() : null,
              },
              { label: 'Notes', value: order.notes },
            ]}
          />

          <DetailSection
            title="Requesting Organization"
            rows={[
              { label: 'Organization', value: order.requestingOrgName },
              { label: 'Submitted By', value: submittedByName },
              { label: 'Created', value: new Date(order.createdAt).toLocaleString() },
              { label: 'Last Updated', value: new Date(order.updatedAt).toLocaleString() },
            ]}
          />

          {(order.approvedById || order.rejectionReason) && (
            <DetailSection
              title="Review & Decision"
              rows={[
                { label: 'Approved By', value: approvedByName },
                {
                  label: 'Approved At',
                  value: order.approvedAt ? new Date(order.approvedAt).toLocaleString() : null,
                },
                { label: 'Rejection Reason', value: order.rejectionReason },
              ]}
            />
          )}

          {auditEvents.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Audit Trail</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {auditEvents.map((evt) => (
                  <li key={evt.id} className="flex items-start gap-3 px-6 py-3 text-sm">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-400 ring-2 ring-white" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-gray-700">{evt.action}</p>
                      {evt.actor && (
                        <p className="text-xs text-gray-500">
                          {evt.actor.firstName} {evt.actor.lastName}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-gray-400">
                      {new Date(evt.occurredAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column — actions */}
        <div className="space-y-4">
          {canAct && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <OrderActions order={order} token={token} />
                {order.state === 'approved' && serviceId && (
                  <CreateWorkOrderButton serviceId={serviceId} token={token} />
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Order Timeline</h3>
            <ol className="relative border-l border-gray-200 pl-4 space-y-4">
              <li>
                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-brand-500 ring-2 ring-white" />
                <time className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleString()}
                </time>
                <p className="mt-0.5 text-sm text-gray-700">Order created</p>
              </li>
              {order.state !== 'draft' && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-blue-400 ring-2 ring-white" />
                  <p className="text-sm text-gray-700 mt-0.5">Submitted for review</p>
                </li>
              )}
              {['under_review', 'pending_approval', 'approved', 'rejected'].includes(
                order.state,
              ) && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-orange-400 ring-2 ring-white" />
                  <p className="text-sm text-gray-700 mt-0.5">Feasibility review started</p>
                </li>
              )}
              {order.state === 'approved' && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                  <time className="text-xs text-gray-400">
                    {order.approvedAt ? new Date(order.approvedAt).toLocaleString() : ''}
                  </time>
                  <p className="mt-0.5 text-sm text-green-700 font-medium">Approved</p>
                </li>
              )}
              {order.state === 'rejected' && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                  <p className="mt-0.5 text-sm text-red-700 font-medium">Rejected</p>
                  {order.rejectionReason && (
                    <p className="text-xs text-gray-500 mt-0.5">{order.rejectionReason}</p>
                  )}
                </li>
              )}
              {order.state === 'cancelled' && (
                <li>
                  <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white" />
                  <p className="mt-0.5 text-sm text-gray-600">Cancelled</p>
                </li>
              )}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
