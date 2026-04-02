import { PageHeader } from '@/components/ui/page-header';
import { sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { EditSiteForm } from './edit-site-form';

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const site = await sitesApi.getOne(token, siteId).catch(() => null);
  if (!site) notFound();

  return (
    <div>
      <PageHeader
        title="Edit Site"
        subtitle={site.code}
        breadcrumb={[
          { label: 'Locations', href: '/locations' },
          { label: site.name, href: `/locations/${siteId}` },
          { label: 'Edit' },
        ]}
      />
      <EditSiteForm
        siteId={siteId}
        defaults={{
          name: site.name,
          address: site.address,
          city: site.city,
          state: (site as any).state,
          country: site.country,
          timezone: (site as any).timezone ?? 'UTC',
          notes: (site as any).notes,
        }}
      />
    </div>
  );
}
