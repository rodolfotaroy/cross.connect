import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, cagesApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { EditCageForm } from './edit-cage-form';

export default async function EditCagePage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string; roomId: string; cageId: string }>;
}) {
  const { siteId, buildingId, roomId, cageId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings, room, cages] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
    roomsApi.getOne(token, roomId).catch(() => null),
    cagesApi.list(token, roomId).catch(() => []),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  const cage = cages.find((c) => c.id === cageId);
  if (!site || !building || !room || !cage) notFound();

  const roomPath = `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`;

  return (
    <div>
      <PageHeader
        title="Edit Cage"
        subtitle={cage.code}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: room.name, href: roomPath },
          { label: 'Edit Cage' },
        ]}
      />
      <EditCageForm
        roomPath={roomPath}
        returnTo={roomPath}
        cageId={cageId}
        defaults={{ name: cage.name, notes: (cage as any).notes }}
      />
    </div>
  );
}
