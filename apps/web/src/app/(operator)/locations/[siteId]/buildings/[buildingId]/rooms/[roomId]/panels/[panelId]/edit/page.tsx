import { EditPanelForm } from '@/app/(operator)/locations/_components/edit-panel-form';
import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, panelsApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { updatePanel } from './actions';

export default async function EditRoomPanelPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string; panelId: string }>;
}) {
  const { siteId, buildingId, roomId, panelId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, panel] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    panelsApi.getOne(token, panelId).catch(() => null),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  if (!site || !building || !room || !panel) notFound();

  const roomPath = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;
  const boundUpdate = updatePanel.bind(null, roomPath, panelId);

  return (
    <div>
      <PageHeader
        title="Edit Panel"
        subtitle={panel.code}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: room.name, href: roomPath },
          { label: 'Edit Panel' },
        ]}
      />
      <EditPanelForm
        panelId={panelId}
        returnTo={roomPath}
        updateAction={boundUpdate}
        defaults={{
          name: panel.name,
          panelType: panel.panelType,
          uPosition: null,
          notes: (panel as any).notes,
        }}
        isRackMounted={false}
      />
    </div>
  );
}
