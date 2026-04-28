import { DedicatedXcStatusBadge } from '@/components/ui/dedicated-xc-status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteXcButton } from './delete-xc-button';

export const metadata: Metadata = { title: 'Cross Connect Detail — SP Portal' };

export default async function XcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const canWrite = role === 'super_admin' || role === 'sp_admin' || role === 'sp_ops';
  const canReport = role === 'super_admin' || role === 'sp_admin' || role === 'sp_report';

  const xc = await dedicatedXcApi.getOne(token, id).catch(() => null);
  if (!xc) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={xc.crossConnectId}
        subtitle={xc.orderingCompany ?? ''}
        actions={
          canWrite && (
            <div className="flex gap-2">
              <Link
                href={`/sp/cross-connects/${id}/edit`}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Link>
              <DeleteXcButton id={id} />
            </div>
          )
        }
      />

      {/* Status + meta row */}
      <div className="flex flex-wrap items-center gap-3">
        <DedicatedXcStatusBadge status={xc.status as any} />
        {xc.year && <span className="text-sm text-gray-500">Year: {xc.year}</span>}
        {xc.quarter && <span className="text-sm text-gray-500">Q{xc.quarter}</span>}
      </div>

      {/* Details grid */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Cross Connect Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Circuit ID" value={xc.circuitId} />
          <Detail label="Ticket #" value={xc.ticketNumber} />
          <Detail label="Cable Type" value={xc.cableType} />
          <Detail label="Customer Type" value={xc.customerType} />
          {canReport && (
            <Detail
              label="MRC"
              value={xc.mrc ? `¥${Math.round(Number(xc.mrc)).toLocaleString()}` : undefined}
            />
          )}
          {canReport && (
            <Detail
              label="NRC"
              value={xc.nrc ? `¥${Math.round(Number(xc.nrc)).toLocaleString()}` : undefined}
            />
          )}
          <Detail
            label="Date Completed"
            value={xc.dateCompleted ? new Date(xc.dateCompleted).toLocaleDateString() : undefined}
          />
          <Detail
            label="Date Disconnected"
            value={
              xc.disconnectionDate ? new Date(xc.disconnectionDate).toLocaleDateString() : undefined
            }
          />
        </dl>
        {xc.notes && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <dt className="text-xs font-medium uppercase text-gray-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{xc.notes}</dd>
          </div>
        )}
      </div>

      {/* Hops */}
      {xc.hops && xc.hops.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Circuit Hops</h2>
          <div className="space-y-4">
            {xc.hops.map((hop: any) => (
              <div key={hop.id} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Hop {hop.hopNumber}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {hop.room && <Detail label="Room" value={hop.room} />}
                  {hop.rack && <Detail label="Rack" value={hop.rack} />}
                  {hop.device && <Detail label="Rack Unit" value={hop.device} />}
                  {hop.port && <Detail label="Port" value={hop.port} />}
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}
