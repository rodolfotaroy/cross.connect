import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, cagesApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { updateRack } from './actions';
import { EditRackForm } from './edit-rack-form';

export default async function EditRackPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string; cageId: string; rackId: string }>;
}) {
  const { siteId, buildingId, roomId, cageId, rackId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, cages, racks] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    cagesApi.list(token, roomId).catch(() => []),
    racksApi.list(token, cageId).catch(() => []),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  const cage = cages.find((c) => c.id === cageId);
  const rack = racks.find((r) => r.id === rackId);
  if (!site || !building || !room || !cage || !rack) notFound();

  const roomPath = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;

  return (
    <div>
      <PageHeader
        title="Edit Rack"
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
        updateAction={updateRack.bind(null, roomPath)}
      />
    </div>
  );
}
