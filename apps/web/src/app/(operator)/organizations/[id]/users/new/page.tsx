import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { AddUserForm } from './add-user-form';

export default async function AddUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const org = await orgsApi.getOne(token, id).catch(() => null);
  if (!org) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Add User"
        breadcrumb={[
          { label: 'Organizations', href: '/organizations' },
          { label: org.name, href: `/organizations/${id}` },
          { label: 'Add User' },
        ]}
      />
      <AddUserForm orgId={id} orgName={org.name} token={token} />
    </div>
  );
}
