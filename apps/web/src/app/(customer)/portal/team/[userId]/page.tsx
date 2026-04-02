import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { ROLE_LABEL } from '@/lib/constants/role-labels';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { TeamUserActions } from './team-user-actions';

export const metadata: Metadata = { title: 'Team Member' };

export default async function TeamUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const currentUserId = (session?.user as any)?.id as string;
  const role = (session?.user as any)?.role as string;
  const orgId = (session?.user as any)?.orgId as string;

  if (!['customer_admin', 'customer_orderer', 'customer_viewer'].includes(role)) {
    redirect('/portal');
  }

  const user = await orgsApi.getUser(token, userId).catch(() => null);
  if (!user || user.orgId !== orgId) notFound();

  const isAdmin = role === 'customer_admin';
  const isSelf = userId === currentUserId;

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title={`${user.firstName} ${user.lastName}${isSelf ? ' (you)' : ''}`}
        breadcrumb={[
          { label: 'My Team', href: '/portal/team' },
          { label: `${user.firstName} ${user.lastName}` },
        ]}
      />

      <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm">
          <span className="font-medium text-gray-500">Email</span>
          <span className="col-span-2 text-gray-900">{user.email}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm">
          <span className="font-medium text-gray-500">Role</span>
          <span className="col-span-2 text-gray-900">
            {ROLE_LABEL[user.role] ?? user.role.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm">
          <span className="font-medium text-gray-500">Status</span>
          <span
            className={`col-span-2 font-medium ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}
          >
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm">
          <span className="font-medium text-gray-500">Member since</span>
          <span className="col-span-2 text-gray-900">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
        {user.lastLoginAt && (
          <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm">
            <span className="font-medium text-gray-500">Last login</span>
            <span className="col-span-2 text-gray-900">
              {new Date(user.lastLoginAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {isAdmin && !isSelf && (
        <TeamUserActions
          userId={user.id}
          currentRole={user.role}
          isActive={user.isActive}
          token={token}
        />
      )}
    </div>
  );
}
