import { PageHeader } from '@/components/ui/page-header';
import { sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { NewBuildingForm } from './new-building-form';

export default async function NewBuildingPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const site = await sitesApi.getOne(token, siteId).catch(() => null);
  if (!site) notFound();

  return (
    <div>
      <PageHeader
        title="Add Building"
        subtitle={`Add a building to ${site.name}`}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: 'Add Building' },
        ]}
      />
      <NewBuildingForm siteId={siteId} />
    </div>
  );
}
