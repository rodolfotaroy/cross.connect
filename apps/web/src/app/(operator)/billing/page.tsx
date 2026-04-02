import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { billingEventsApi, type BillingTriggerEventDto } from '@/lib/api/billing-events';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Billing Events' };

const TYPE_BADGE: Record<string, string> = {
  service_activated: 'bg-green-100 text-green-700',
  service_disconnected: 'bg-red-100 text-red-600',
  temporary_extended: 'bg-purple-100 text-purple-700',
  reroute_completed: 'bg-blue-100 text-blue-700',
};

export default async function BillingEventsPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const events = await billingEventsApi
    .listPending(token)
    .catch(() => [] as BillingTriggerEventDto[]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Events"
        subtitle={`${events.length} pending export${events.length !== 1 ? 's' : ''}`}
      />

      {events.length === 0 ? (
        <EmptyState
          title="No pending billing events"
          description="All events have been exported to the billing system."
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
                    Event Type
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
                    MRC
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    NRC
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Occurred At
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Exported
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[ev.eventType] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ev.eventType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {ev.service ? (
                        <Link
                          href={`/services/${ev.service.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {ev.service.serviceNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-500">{ev.serviceId.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {ev.mrcCents != null ? `$${(ev.mrcCents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {ev.nrcCents != null ? `$${(ev.nrcCents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {new Date(ev.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {ev.exportedAt ? (
                        <span className="text-xs text-green-600">
                          {new Date(ev.exportedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        To mark events as exported, call{' '}
        <code className="font-mono">POST /api/v1/billing-events/mark-exported</code> from your
        billing integration.
      </p>
    </div>
  );
}
