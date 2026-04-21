import { PageHeader } from '@/components/ui/page-header';
import { spTeamApi } from '@/lib/api/sp-team';
import { auth } from '@/lib/auth/session';
import { ROLE_LABEL } from '@/lib/constants/role-labels';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DeactivateSpUserButton } from '../deactivate-sp-user-button';

export const metadata: Metadata = { title: 'Team Member — SP Portal' };

export default async function SpOrganizationUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const currentUserId = (session?.user as any)?.id as string;

  const user = await spTeamApi.getOne(token, userId).catch(() => null);
  if (!user) notFound();

  const isSelf = user.id === currentUserId;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`.trim() || user.email}
        subtitle={ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role}
        breadcrumb={[
          { label: 'Organization', href: '/sp/organization' },
          { label: `${user.firstName} ${user.lastName}`.trim() || user.email },
        ]}
        actions={!isSelf && <DeactivateSpUserButton userId={user.id} isActive={user.isActive} />}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Detail label="Name" value={`${user.firstName} ${user.lastName}`.trim()} />
          <Detail label="Email" value={user.email} />
          <Detail
            label="Role"
            value={ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role}
          />
          <Detail
            label="Status"
            value={
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            }
          />
          {user.createdAt && (
            <Detail label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
          )}
        </dl>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}
