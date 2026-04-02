import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, cagesApi, roomsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { NewRackForm } from './new-rack-form';

export default async function NewRackPage({
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

  return (
    <div>
      <PageHeader
        title="Add Rack"
        subtitle={`Add a rack to ${cage.name}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          {
            label: room.name,
            href: `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`,
          },
          {
            label: cage.name,
            href: `/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`,
          },
          { label: 'Add Rack' },
        ]}
      />
      <NewRackForm
        cageId={cageId}
        redirectTo={`/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`}
      />
    </div>
  );
}
