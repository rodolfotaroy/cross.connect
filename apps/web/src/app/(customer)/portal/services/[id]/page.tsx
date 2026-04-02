import { DetailSection } from '@/components/ui/detail-section';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, ServiceStateBadge } from '@/components/ui/status-badge';
import { servicesApi } from '@/lib/api/services';
import { auth } from '@/lib/auth/session';
import type { CrossConnectServiceDto } from '@xc/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function CustomerServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const svc = (await servicesApi.getOne(token, id).catch(() => null)) as
    | (CrossConnectServiceDto & Record<string, any>)
    | null;
  if (!svc) notFound();

  const aSide = svc.endpoints?.find((e: any) => e.endpointSide === 'a_side');
  const zSide = svc.endpoints?.find((e: any) => e.endpointSide === 'z_side');

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={svc.serviceNumber}
        subtitle="Cross-Connect Service"
        breadcrumb={[
          { label: 'Active Services', href: '/portal/services' },
          { label: svc.serviceNumber },
        ]}
        actions={<ServiceStateBadge state={svc.state} />}
      />

      {/* Key details */}
      <DetailSection
        title="Service Details"
        rows={[
          { label: 'State', value: <ServiceStateBadge state={svc.state} /> },
          { label: 'Type', value: svc.order?.serviceType?.replace(/_/g, ' ') ?? null },
          { label: 'Media', value: svc.order?.mediaType?.toUpperCase() ?? null },
          { label: 'Speed', value: svc.order?.speedGbps ? `${svc.order.speedGbps} Gbps` : null },
          {
            label: 'Activated',
            value: svc.activatedAt ? new Date(svc.activatedAt).toLocaleDateString() : null,
          },
          {
            label: 'Expires',
            value: svc.expiresAt ? new Date(svc.expiresAt).toLocaleDateString() : null,
          },
          {
            label: 'Temporary',
            value: svc.isTemporary ? <Badge label="Yes" variant="warn" /> : 'No',
          },
          {
            label: 'Order',
            value: svc.orderId ? (
              <Link
                href={`/portal/orders/${svc.orderId}`}
                className="text-brand-600 hover:underline text-sm"
              >
                {svc.order?.orderNumber ?? svc.orderId.slice(0, 8) + '…'}
              </Link>
            ) : null,
          },
        ]}
      />

      {/* Endpoints */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Endpoints</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 px-6 py-4">
          <EndpointSection label="A-Side" endpoint={aSide} />
          <EndpointSection label="Z-Side" endpoint={zSide} />
        </div>
      </div>
    </div>
  );
}

function EndpointSection({ label, endpoint }: { label: string; endpoint: any }) {
  if (!endpoint) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        <p className="text-sm text-gray-400">—</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <dl className="space-y-1 text-sm">
        {endpoint.organizationName && (
          <div>
            <dt className="text-xs text-gray-400">Organisation</dt>
            <dd className="text-gray-900">{endpoint.organizationName}</dd>
          </div>
        )}
        {endpoint.endpointType && (
          <div>
            <dt className="text-xs text-gray-400">Type</dt>
            <dd className="capitalize text-gray-700">{endpoint.endpointType.replace(/_/g, ' ')}</dd>
          </div>
        )}
        {endpoint.demarcPoint && (
          <div>
            <dt className="text-xs text-gray-400">Demarc Point</dt>
            <dd className="font-mono text-gray-700">
              {endpoint.demarcPoint.label ?? endpoint.demarcPoint.id}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
