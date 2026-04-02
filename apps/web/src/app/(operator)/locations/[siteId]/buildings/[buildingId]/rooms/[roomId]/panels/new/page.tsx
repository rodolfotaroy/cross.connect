import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { NewRoomPanelForm } from './new-room-panel-form';

export default async function NewRoomPanelPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string }>;
}) {
  const { siteId, buildingId, roomId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  if (!site || !building || !room) notFound();

  return (
    <div>
      <PageHeader
        title="Add Room Panel"
        subtitle={`Add a panel to ${room.name}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          {
            label: room.name,
            href: `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`,
          },
          { label: 'Add Panel' },
        ]}
      />
      <NewRoomPanelForm
        roomId={roomId}
        redirectTo={`/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`}
      />
    </div>
  );
}
