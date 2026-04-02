import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, cagesApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { createRackPanel } from './actions';
import { NewRackPanelForm } from './new-rack-panel-form';

export default async function NewRackPanelPage({
  params,
}: {
  params: Promise<{
    siteId: string;
    buildingId: string;
    roomId: string;
    cageId: string;
    rackId: string;
  }>;
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

  const roomUrl = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;

  return (
    <div>
      <PageHeader
        title="Add Rack Panel"
        subtitle={`Add a panel to ${rack.name}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: room.name, href: roomUrl },
          { label: cage.name, href: roomUrl },
          { label: rack.name, href: roomUrl },
          { label: 'Add Panel' },
        ]}
      />
      <NewRackPanelForm rackId={rackId} redirectTo={roomUrl} createAction={createRackPanel.bind(null, roomUrl)} />
    </div>
  );
}
