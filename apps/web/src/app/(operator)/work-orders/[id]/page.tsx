import { Badge, WorkOrderStateBadge } from '@/components/ui/status-badge';
import { workOrdersApi } from '@/lib/api/work-orders';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkOrderActions } from './work-order-actions';

const STATE_ORDER: Record<string, number> = {
  created: 0,
  assigned: 1,
  in_progress: 2,
  pending_test: 3,
  completed: 4,
  cancelled: 4,
};

const TIMELINE_EVENTS = [
  { key: 'created', label: 'Work order created', color: 'bg-brand-500' },
  { key: 'assigned', label: 'Assigned to technician', color: 'bg-blue-400' },
  { key: 'in_progress', label: 'Work started', color: 'bg-orange-400' },
  { key: 'pending_test', label: 'Ready for testing', color: 'bg-yellow-400' },
  { key: 'completed', label: 'Completed', color: 'bg-green-500' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-gray-400' },
];

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const orgId = (session?.user as any)?.orgId as string;

  const wo = await workOrdersApi.getOne(token, id).catch(() => null);
  if (!wo) notFound();

  const currentStateOrder = STATE_ORDER[wo.state] ?? 0;
  const isTech = ['super_admin', 'ops_manager', 'ops_technician'].includes(role);
  const terminalStates = ['completed', 'cancelled'];

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/work-orders" className="hover:underline">
              Work Orders
            </Link>
            <span>/</span>
            <span className="font-mono">{wo.woNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{wo.woNumber}</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">
            {wo.woType.replace(/_/g, ' ')} work order
          </p>
        </div>
        <WorkOrderStateBadge state={wo.state} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Detail cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key info */}
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
              Details
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400">WO Number</dt>
                <dd className="font-mono font-semibold text-gray-900">{wo.woNumber}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Type</dt>
                <dd>
                  <Badge label={wo.woType.replace(/_/g, ' ')} variant="info" />
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">State</dt>
                <dd>
                  <WorkOrderStateBadge state={wo.state} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Service</dt>
                <dd>
                  {wo.service ? (
                    <Link
                      href={`/services/${wo.service.id}`}
                      className="font-mono text-brand-600 hover:underline"
                    >
                      {wo.service.serviceNumber}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs text-gray-500">
                      {wo.serviceId.slice(0, 8)}…
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Assigned To</dt>
                <dd className="text-gray-700">
                  {wo.assignedTo ? (
                    `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Scheduled At</dt>
                <dd className="text-gray-700">
                  {wo.scheduledAt ? new Date(wo.scheduledAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Completed At</dt>
                <dd className="text-gray-700">
                  {wo.completedAt ? new Date(wo.completedAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-700">{new Date(wo.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          {/* Tech notes */}
          {wo.techNotes && (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Tech Notes
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{wo.techNotes}</p>
            </div>
          )}

          {/* Cable path */}
          {wo.cablePath && (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Cable Path
              </h2>
              <div className="mb-2 flex items-center gap-3">
                <span className="text-sm capitalize font-medium text-gray-700">
                  {wo.cablePath.pathRole?.replace(/_/g, ' ')} path
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    wo.cablePath.state === 'active'
                      ? 'bg-green-100 text-green-700'
                      : wo.cablePath.state === 'installed'
                        ? 'bg-blue-100 text-blue-700'
                        : wo.cablePath.state === 'planned'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {wo.cablePath.state}
                </span>
              </div>
              {wo.cablePath.segments?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-gray-500 font-medium">
                          #
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-gray-500 font-medium">
                          From Port
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-gray-500 font-medium">
                          To Port
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-gray-500 font-medium">
                          Type
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-gray-500 font-medium">
                          Cable Label
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {wo.cablePath.segments.map((seg) => (
                        <tr key={seg.id}>
                          <td className="px-3 py-2 text-gray-500">{seg.sequence}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">
                            {seg.fromPort?.label ?? seg.fromPortId.slice(0, 8) + '…'}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-700">
                            {seg.toPort?.label ?? seg.toPortId.slice(0, 8) + '…'}
                          </td>
                          <td className="px-3 py-2 capitalize text-gray-600">{seg.segmentType}</td>
                          <td className="px-3 py-2 text-gray-600">{seg.physicalCableLabel ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No segments recorded.</p>
              )}
            </div>
          )}

          {/* Audit trail */}
          {wo.auditEvents?.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Audit Trail
              </h2>
              <ul className="space-y-2">
                {wo.auditEvents.map((ev: any) => (
                  <li key={ev.id} className="flex gap-3 text-xs text-gray-600">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </span>
                    <span className="font-medium">{ev.action}</span>
                    {ev.actor && (
                      <span className="text-gray-400">
                        by {ev.actor.firstName} {ev.actor.lastName}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: actions + timeline */}
        <div className="space-y-4">
          {isTech && !terminalStates.includes(wo.state) && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-base font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="px-6 py-4">
                <WorkOrderActions wo={wo} token={token} role={role} orgId={orgId} />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Progress</h3>
            <ol className="relative border-l border-gray-200 pl-4 space-y-4">
              {TIMELINE_EVENTS.filter((ev) =>
                wo.state === 'cancelled'
                  ? ev.key === 'cancelled' || STATE_ORDER[ev.key] < currentStateOrder
                  : ev.key !== 'cancelled' && STATE_ORDER[ev.key] <= currentStateOrder,
              ).map((ev) => (
                <li key={ev.key}>
                  <span
                    className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ring-2 ring-white ${ev.color}`}
                  />
                  <p className="text-sm text-gray-700 mt-0.5">{ev.label}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
