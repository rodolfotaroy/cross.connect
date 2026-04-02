import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { DetailSection } from '@/components/ui/detail-section';
import { PageHeader } from '@/components/ui/page-header';
import { RoomTypeBadge } from '@/components/ui/status-badge';
import type { BuildingDto } from '@/lib/api/locations';
import { buildingsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deactivateSite } from './edit/actions';

async function BuildingCard({
  building,
  token,
  siteId,
}: {
  building: BuildingDto;
  token: string;
  siteId: string;
}) {
  // Inline import to avoid circular deps
  const { roomsApi } = await import('@/lib/api/locations');
  const rooms = await roomsApi.list(token, building.id).catch(() => []);
  const mmrRooms = rooms.filter((r) => r.roomType === 'mmr');

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-600">
            {building.code}
          </span>
          <h3 className="mt-0.5 font-semibold text-gray-900">
            <Link
              href={`/locations/${siteId}/buildings/${building.id}`}
              className="hover:text-brand-600 hover:underline"
            >
              {building.name}
            </Link>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {building.floors && (
            <span className="text-sm text-gray-500">{building.floors} floors</span>
          )}
          <Link
            href={`/locations/${siteId}/buildings/${building.id}/edit`}
            className="text-xs font-medium text-gray-500 hover:text-brand-600"
          >
            Edit
          </Link>
          <Link
            href={`/locations/${siteId}/buildings/${building.id}`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Manage
          </Link>
        </div>
      </div>
      {rooms.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">No rooms configured.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500"
              >
                Room
              </th>
              <th
                scope="col"
                className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500"
              >
                Code
              </th>
              <th
                scope="col"
                className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-500"
              >
                Type
              </th>
              <th className="px-6 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-gray-50">
                <td className="px-6 py-2 text-gray-900">{room.name}</td>
                <td className="px-6 py-2 font-mono text-gray-600">{room.code}</td>
                <td className="px-6 py-2">
                  <RoomTypeBadge roomType={room.roomType} />
                </td>
                <td className="px-6 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/locations/${siteId}/buildings/${building.id}/rooms/${room.id}`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/inventory?roomId=${room.id}`}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Inventory
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {mmrRooms.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-3">
          <p className="text-xs text-gray-500">
            MMR rooms:{' '}
            {mmrRooms.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ', '}
                <Link
                  href={`/inventory?roomId=${r.id}`}
                  className="font-mono text-brand-600 hover:underline"
                >
                  {r.code}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
  ]);

  if (!site) notFound();

  return (
    <div>
      <PageHeader
        title={site.name}
        subtitle={`${site.city}, ${site.country}`}
        breadcrumb={[{ label: 'Locations', href: '/locations' }, { label: site.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/inventory?siteId=${siteId}`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
            >
              Site Availability
            </Link>
            <Link
              href={`/locations/${siteId}/edit`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <ConfirmDelete
              action={deactivateSite.bind(null, siteId)}
              entityName="site"
              redirectTo="/locations"
              warning="Requires all buildings to be deactivated first."
            />
          </div>
        }
      />

      <div className="mb-6">
        <DetailSection
          title="Site Information"
          rows={[
            { label: 'Code', value: <span className="font-mono font-semibold">{site.code}</span> },
            { label: 'Address', value: site.address },
            { label: 'City', value: site.city },
            { label: 'Country', value: site.country },
            { label: 'Buildings', value: String(buildings.length) },
            { label: 'Created', value: new Date(site.createdAt).toLocaleDateString() },
          ]}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Buildings ({buildings.length})</h2>
        <Link
          href={`/locations/${siteId}/buildings/new`}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          + Add building
        </Link>
      </div>

      {buildings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">No buildings added yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {buildings.map((b) => (
            <BuildingCard key={b.id} building={b} token={token} siteId={siteId} />
          ))}
        </div>
      )}
    </div>
  );
}
