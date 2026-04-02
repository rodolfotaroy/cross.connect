import { PageHeader } from '@/components/ui/page-header';
import { OrderStateBadge } from '@/components/ui/status-badge';
import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { title: 'Order Detail' };

const TIMELINE = [
  { state: 'draft', label: 'Request created', color: 'bg-brand-500' },
  { state: 'submitted', label: 'Submitted for review', color: 'bg-blue-400' },
  { state: 'under_review', label: 'Feasibility review in progress', color: 'bg-orange-400' },
  { state: 'pending_approval', label: 'Pending final approval', color: 'bg-yellow-400' },
  { state: 'approved', label: 'Approved — provisioning started', color: 'bg-green-500' },
  { state: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { state: 'cancelled', label: 'Cancelled', color: 'bg-gray-400' },
];

const STATE_ORDER: Record<string, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  pending_approval: 3,
  approved: 4,
  rejected: 4,
  cancelled: 4,
};

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const order = await ordersApi.getOne(token, id).catch(() => null);
  if (!order) notFound();

  const currentOrder = STATE_ORDER[order.state] ?? 0;
  const terminalStates = ['approved', 'rejected', 'cancelled'];

  const completedTimeline = TIMELINE.filter((ev) => {
    if (order.state === 'rejected')
      return ev.state === 'rejected' || STATE_ORDER[ev.state] < currentOrder;
    if (order.state === 'cancelled')
      return ev.state === 'cancelled' || STATE_ORDER[ev.state] < currentOrder;
    return !['rejected', 'cancelled'].includes(ev.state) && STATE_ORDER[ev.state] <= currentOrder;
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={order.orderNumber}
        subtitle={`${order.serviceType.replace(/_/g, ' ')} · ${order.mediaType.toUpperCase()}`}
        breadcrumb={[{ label: 'My Orders', href: '/portal/orders' }, { label: order.orderNumber }]}
        actions={<OrderStateBadge state={order.state} />}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Order info */}
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Order #">
              <span className="font-mono font-semibold">{order.orderNumber}</span>
            </Row>
            <Row label="Service Type">{order.serviceType.replace(/_/g, ' ')}</Row>
            <Row label="Media">
              <span className="uppercase font-mono">{order.mediaType}</span>
            </Row>
            {order.speedGbps && <Row label="Speed">{order.speedGbps} Gbps</Row>}
            {order.isTemporary && (
              <Row label="Temporary">
                <span className="text-yellow-700 font-medium">Yes</span>
              </Row>
            )}
            {order.requestedActiveAt && (
              <Row label="Requested Active">
                {new Date(order.requestedActiveAt).toLocaleDateString()}
              </Row>
            )}
            {order.expiresAt && (
              <Row label="Expires">{new Date(order.expiresAt).toLocaleDateString()}</Row>
            )}
            {order.notes && (
              <Row label="Notes">
                <span className="text-gray-600">{order.notes}</span>
              </Row>
            )}
            <Row label="Submitted">{new Date(order.createdAt).toLocaleDateString()}</Row>
            <Row label="Last Updated">{new Date(order.updatedAt).toLocaleDateString()}</Row>
          </dl>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Status Timeline
          </h2>
          <ol className="relative border-l border-gray-200 pl-4 space-y-4">
            {completedTimeline.map((ev) => (
              <li key={ev.state}>
                <span
                  className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ring-2 ring-white ${ev.color}`}
                />
                <p className="text-sm text-gray-700">{ev.label}</p>
              </li>
            ))}
          </ol>
          {!terminalStates.includes(order.state) && (
            <p className="mt-4 text-xs text-gray-400">
              We'll update this page as your request progresses. No action required from you at this
              time.
            </p>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {order.state === 'rejected' && order.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-5 py-4">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Reason for Rejection</h3>
          <p className="text-sm text-red-600">{order.rejectionReason}</p>
        </div>
      )}

      {/* Approval / service status banner */}
      {order.state === 'approved' &&
        (() => {
          const svc = (order as any).service;
          if (svc?.state === 'active' || svc?.state === 'suspended') {
            return (
              <div className="rounded-md border border-green-200 bg-green-50 px-5 py-4">
                <h3 className="text-sm font-semibold text-green-700 mb-1">
                  Your cross-connect is live!
                </h3>
                <p className="text-sm text-green-600">
                  Service{' '}
                  <Link href={`/portal/services/${svc.id}`} className="underline font-medium">
                    {svc.serviceNumber}
                  </Link>{' '}
                  is currently <span className="font-medium">{svc.state}</span>.
                </p>
              </div>
            );
          }
          if (svc) {
            return (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-5 py-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-1">
                  Your cross-connect has been approved!
                </h3>
                <p className="text-sm text-blue-600">
                  Service{' '}
                  <Link href={`/portal/services/${svc.id}`} className="underline font-medium">
                    {svc.serviceNumber}
                  </Link>{' '}
                  is being provisioned. You can track it in{' '}
                  <Link href="/portal/services" className="underline font-medium">
                    Active Services
                  </Link>
                  .
                </p>
              </div>
            );
          }
          return (
            <div className="rounded-md border border-green-200 bg-green-50 px-5 py-4">
              <h3 className="text-sm font-semibold text-green-700 mb-1">
                Your cross-connect has been approved!
              </h3>
              <p className="text-sm text-green-600">
                Our team will provision your service shortly. You can track it in{' '}
                <Link href="/portal/services" className="underline font-medium">
                  Active Services
                </Link>
                .
              </p>
            </div>
          );
        })()}

      <div className="pt-2">
        <Link href="/portal/orders" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to My Orders
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-400 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{children}</dd>
    </div>
  );
}
