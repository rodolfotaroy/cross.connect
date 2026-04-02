import { EditRackForm } from '@/app/(operator)/locations/_components/edit-rack-form';
import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { updateRoomRack } from './actions';

export default async function EditRoomRackPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string; rackId: string }>;
}) {
  const { siteId, buildingId, roomId, rackId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, racks] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    racksApi.listByRoom(token, roomId).catch(() => []),
  ]);

  const building = buildings.find((b) => b.id === buildingId);
  const rack = racks.find((r) => r.id === rackId);
  if (!site || !building || !room || !rack) notFound();

  const roomPath = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;

  return (
    <div>
      <PageHeader
        title="Edit Standalone Rack"
        subtitle={rack.code}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: room.name, href: roomPath },
          { label: 'Edit Rack' },
        ]}
      />
      <EditRackForm
        returnTo={roomPath}
        rackId={rackId}
        defaults={{ name: rack.name, uSize: rack.uSize ?? 42, notes: (rack as any).notes }}
        updateAction={updateRoomRack.bind(null, roomPath)}
      />
    </div>
  );
}
