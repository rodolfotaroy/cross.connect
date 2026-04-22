import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { notFound } from 'next/navigation';
import { EditUserForm } from './edit-user-form';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const [org, user] = await Promise.all([
    orgsApi.getOne(token, id).catch(() => null),
    orgsApi.getUser(token, userId).catch(() => null),
  ]);

  if (!org || !user) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Edit User"
        breadcrumb={[
          { label: 'Organizations', href: '/organizations' },
          { label: org.name, href: `/organizations/${id}` },
          { label: `${user.firstName} ${user.lastName}` },
        ]}
      />
      <EditUserForm orgId={id} orgType={org.orgType} user={user} token={token} />
    </div>
  );
}
