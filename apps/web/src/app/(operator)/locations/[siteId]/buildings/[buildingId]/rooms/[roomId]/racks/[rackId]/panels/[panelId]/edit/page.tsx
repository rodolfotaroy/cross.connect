import { updatePanel } from '@/app/(operator)/locations/[siteId]/buildings/[buildingId]/rooms/[roomId]/panels/[panelId]/edit/actions';
import { EditPanelForm } from '@/app/(operator)/locations/_components/edit-panel-form';
import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, panelsApi, racksApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

export default async function EditStandaloneRackPanelPage({
  params,
}: {
  params: Promise<{
    siteId: string;
    buildingId: string;
    roomId: string;
    rackId: string;
    panelId: string;
  }>;
}) {
  const { siteId, buildingId, roomId, rackId, panelId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, racks, panel] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    racksApi.listByRoom(token, roomId).catch(() => []),
    panelsApi.getOne(token, panelId).catch(() => null),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  const rack = racks.find((r) => r.id === rackId);
  if (!site || !building || !room || !rack || !panel) notFound();

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
          uPosition: (panel as any).uPosition ?? null,
          notes: (panel as any).notes,
        }}
        isRackMounted={true}
      />
    </div>
  );
}
