import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import type { UserDto } from '@/lib/api/organizations';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { ROLE_LABEL } from '@/lib/constants/role-labels';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DeactivateTeamUserButton } from './deactivate-team-user-button';

export const metadata: Metadata = { title: 'My Team' };

export default async function TeamPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const currentUserId = (session?.user as any)?.id as string;
  const role = (session?.user as any)?.role as string;
  const orgId = (session?.user as any)?.orgId as string;
  const orgName = (session?.user as any)?.orgName as string | undefined;
  const isAdmin = role === 'customer_admin';

  const users = await orgsApi.listUsers(token, orgId).catch(() => [] as UserDto[]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Team"
        subtitle={`${orgName ? `${orgName} · ` : ''}${users.length} member${users.length !== 1 ? 's' : ''}`}
        actions={
          isAdmin ? (
            <Link
              href="/portal/team/new"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Invite Member
            </Link>
          ) : undefined
        }
      />

      {users.length === 0 ? (
        <EmptyState
          title="No team members yet"
          description="Invite colleagues to give them access to your organisation's cross-connect portal."
          {...(isAdmin && { action: { label: '+ Invite Member', href: '/portal/team/new' } })}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Status
                  </th>
                  {isAdmin && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      <Link
                        href={`/portal/team/${u.id}`}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {u.firstName} {u.lastName}
                      </Link>
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-3 text-gray-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge
                        label={ROLE_LABEL[u.role] ?? u.role.replace(/_/g, ' ')}
                        variant="info"
                      />
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        label={u.isActive ? 'Active' : 'Inactive'}
                        variant={u.isActive ? 'success' : 'neutral'}
                      />
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-3 text-right">
                        {u.isActive && u.id !== currentUserId && (
                          <DeactivateTeamUserButton
                            userId={u.id}
                            userName={`${u.firstName} ${u.lastName}`}
                            token={token}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
