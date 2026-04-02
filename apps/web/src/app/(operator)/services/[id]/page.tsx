import { DetailSection } from '@/components/ui/detail-section';
import { PageHeader } from '@/components/ui/page-header';
import { ServiceStateBadge } from '@/components/ui/status-badge';
import { servicesApi } from '@/lib/api/services';
import { auth } from '@/lib/auth/session';
import type { CrossConnectServiceDto } from '@xc/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CablePathManagement } from './cable-path-management';
import { ServiceActions } from './service-actions';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;

  const svc = (await servicesApi.getOne(token, id).catch(() => null)) as
    | (CrossConnectServiceDto & Record<string, any>)
    | null;
  if (!svc) notFound();

  const aSide = svc.endpoints?.find((e: any) => e.endpointSide === 'a_side');
  const zSide = svc.endpoints?.find((e: any) => e.endpointSide === 'z_side');

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={svc.serviceNumber}
        subtitle="Cross-Connect Service"
        breadcrumb={[{ label: 'Services', href: '/services' }, { label: svc.serviceNumber }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left/main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service details */}
          <DetailSection
            title="Service Details"
            rows={[
              { label: 'State', value: <ServiceStateBadge state={svc.state} /> },
              { label: 'Type', value: svc.order?.serviceType?.replace(/_/g, ' ') ?? null },
              { label: 'Media', value: svc.order?.mediaType?.toUpperCase() ?? null },
              {
                label: 'Speed',
                value: svc.order?.speedGbps ? `${svc.order.speedGbps} Gbps` : null,
              },
              { label: 'Activated', value: svc.activatedAt ? fmt(svc.activatedAt) : null },
              { label: 'Expires', value: svc.expiresAt ? fmt(svc.expiresAt) : null },
              { label: 'Temporary', value: svc.isTemporary ? 'Yes' : 'No' },
              {
                label: 'Order',
                value: svc.orderId ? (
                  <Link
                    href={`/orders/${svc.orderId}`}
                    className="text-brand-600 hover:underline text-sm"
                  >
                    {svc.order?.orderNumber ?? svc.orderId}
                  </Link>
                ) : null,
              },
            ]}
          />

          {/* Endpoints */}
          <Section title="Endpoints">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EndpointCard label="A-Side" endpoint={aSide} />
              <EndpointCard label="Z-Side" endpoint={zSide} />
            </div>
          </Section>

          {/* Cable paths with management controls */}
          <CablePathManagement
            serviceId={svc.id}
            cablePaths={svc.cablePaths ?? []}
            token={token}
            role={role}
          />

          {/* Requesting org */}
          {svc.order?.requestingOrg && (
            <Section title="Requesting Organisation">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{svc.order.requestingOrg.name}</p>
                <p className="text-gray-400 font-mono">{svc.order.requestingOrg.code}</p>
              </div>
            </Section>
          )}
        </div>

        {/* Right column: service actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Actions</h2>
            </div>
            <div className="px-6 py-4">
              <ServiceActions svc={svc} token={token} role={role} />
              {['disconnected'].includes(svc.state) && (
                <p className="text-sm text-gray-400 italic">
                  No actions available — service is disconnected.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function pathStateClass(state: string) {
  const map: Record<string, string> = {
    planned: 'bg-gray-100 text-gray-600',
    installed: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    rerouting: 'bg-yellow-100 text-yellow-800',
    decommissioned: 'bg-gray-200 text-gray-400',
  };
  return map[state] ?? 'bg-gray-100 text-gray-600';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

function EndpointCard({ label, endpoint }: { label: string; endpoint: any }) {
  if (!endpoint) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">{label}</p>
        <p className="text-sm text-gray-400">No endpoint data</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900 capitalize">
        {endpoint.endpointType?.replace(/_/g, ' ')}
      </p>
      {endpoint.organizationName && (
        <p className="text-sm text-gray-600">{endpoint.organizationName}</p>
      )}
      {endpoint.demarc && <p className="mt-1 text-xs text-gray-400">Demarc: {endpoint.demarc}</p>}
      {endpoint.assignedPanel && (
        <p className="mt-1 text-xs text-gray-400">
          Panel: {endpoint.assignedPanel.code} — {endpoint.assignedPanel.name}
        </p>
      )}
    </div>
  );
}
