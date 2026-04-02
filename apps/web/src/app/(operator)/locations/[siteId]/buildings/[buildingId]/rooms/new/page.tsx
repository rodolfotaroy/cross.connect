import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { NewRoomForm } from './new-room-form';

export default async function NewRoomPage({
  params,
}: {
  params: Promise<{ siteId: string; buildingId: string }>;
}) {
  const { siteId, buildingId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [site, buildings] = await Promise.all([
    sitesApi.getOne(token, siteId).catch(() => null),
    buildingsApi.list(token, siteId).catch(() => []),
  ]);
  const building = buildings.find((b) => b.id === buildingId);
  if (!building || !site) notFound();

  return (
    <div>
      <PageHeader
        title="Add Room"
        subtitle={`Add a room to ${building.name}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: 'Add Room' },
        ]}
      />
      <NewRoomForm
        buildingId={buildingId}
        redirectTo={`/locations/${siteId}/buildings/${buildingId}`}
      />
    </div>
  );
}
