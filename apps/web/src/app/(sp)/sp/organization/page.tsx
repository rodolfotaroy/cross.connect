import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { spTeamApi } from '@/lib/api/sp-team';
import { auth } from '@/lib/auth/session';
import { ROLE_LABEL } from '@/lib/constants/role-labels';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DeactivateSpUserButton } from './deactivate-sp-user-button';

export const metadata: Metadata = { title: 'Organization — SP Portal' };

export default async function SpOrganizationPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const currentUserId = (session?.user as any)?.id as string;
  const orgName = (session?.user as any)?.orgName as string | undefined;

  const users = await spTeamApi.list(token).catch(() => [] as any[]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={orgName ?? 'My Organization'}
        subtitle="Service Partner"
        actions={
          <Link
            href="/sp/organization/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add Member
          </Link>
        }
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Team Members ({users.length})</h2>

        {users.length === 0 ? (
          <EmptyState
            title="No team members yet"
            description="Add colleagues to grant them access to the SP portal."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-3 font-medium">
                        <Link
                          href={`/sp/organization/${u.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {u.firstName} {u.lastName}
                        </Link>
                        {u.id === currentUserId && (
                          <span className="ml-2 text-xs text-gray-400">(you)</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-gray-600">{u.email}</td>
                      <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                        {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        {u.id !== currentUserId && (
                          <DeactivateSpUserButton userId={u.id} isActive={u.isActive} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
