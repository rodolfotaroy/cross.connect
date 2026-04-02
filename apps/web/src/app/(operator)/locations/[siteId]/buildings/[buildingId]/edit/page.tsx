import { PageHeader } from '@/components/ui/page-header';
import { buildingsApi, sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { EditBuildingForm } from './edit-building-form';

export default async function EditBuildingPage({
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
  if (!site || !building) notFound();

  return (
    <div>
      <PageHeader
        title="Edit Building"
        subtitle={building.code}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: building.name, href: `/locations/${siteId}/buildings/${buildingId}` },
          { label: 'Edit' },
        ]}
      />
      <EditBuildingForm
        siteId={siteId}
        buildingId={buildingId}
        defaults={{ name: building.name, notes: (building as any).notes }}
      />
    </div>
  );
}
