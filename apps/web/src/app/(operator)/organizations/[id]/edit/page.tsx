import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { EditOrgForm } from './edit-form';

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const org = await orgsApi.getOne(token, id).catch(() => null);
  if (!org || !org.isActive) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Edit Organisation"
        breadcrumb={[
          { label: 'Organizations', href: '/organizations' },
          { label: org.name, href: `/organizations/${id}` },
          { label: 'Edit' },
        ]}
      />
      <EditOrgForm org={org} token={token} />
    </div>
  );
}
