import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { PageHeader } from '@/components/ui/page-header';
import { RoomTypeBadge } from '@/components/ui/status-badge';
import { buildingsApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deactivateBuilding } from './edit/actions';

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string }>;
}) {
  const { siteId, buildingId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, rooms] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.list(token, buildingId).catch(() => []),
  ]);

  const building = buildings.find((b) => b.id === buildingId);
  if (!building || !site) notFound();

  return (
    <div>
      <PageHeader
        title={building.name}
        subtitle={`Code: ${building.code}${building.floors ? ` · ${building.floors} floors` : ''}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/locations/${siteId}/buildings/${buildingId}/edit`}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
            <ConfirmDelete
              action={deactivateBuilding.bind(null, siteId, buildingId)}
              entityName="building"
              redirectTo={`/locations/${siteId}`}
              warning="Requires all rooms to be deactivated first."
            />
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Rooms ({rooms.length})</h2>
        <Link
          href={`/locations/${siteId}/buildings/${buildingId}/rooms/new`}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Room
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">No rooms added yet.</p>
          <Link
            href={`/locations/${siteId}/buildings/${buildingId}/rooms/new`}
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Add the first room
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                >
                  Room
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                >
                  Type
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{room.name}</td>
                  <td className="px-6 py-3 font-mono text-gray-600">{room.code}</td>
                  <td className="px-6 py-3">
                    <RoomTypeBadge roomType={room.roomType} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/locations/${siteId}/buildings/${buildingId}/rooms/${room.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
