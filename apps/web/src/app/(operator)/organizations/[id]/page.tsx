import { DetailSection } from '@/components/ui/detail-section';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeactivateOrgButton, DeactivateUserButton } from './deactivate-buttons';

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const canManage = ['super_admin', 'ops_manager'].includes(role);

  const [org, users] = await Promise.all([
    orgsApi.getOne(token, id).catch(() => null),
    orgsApi.listUsers(token, id).catch(() => []),
  ]);

  if (!org) notFound();

  return (
    <div>
      <PageHeader
        title={org.name}
        subtitle={`Code: ${org.code}`}
        breadcrumb={[{ label: 'Organizations', href: '/organizations' }, { label: org.name }]}
        actions={
          <div className="flex gap-2">
            {org.isActive && (
              <Link
                href={`/organizations/${id}/edit`}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                Edit
              </Link>
            )}
            {org.isActive && canManage && (
              <DeactivateOrgButton orgId={id} orgName={org.name} token={token} />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailSection
          title="Organization Details"
          rows={[
            { label: 'Name', value: org.name },
            { label: 'Code', value: <span className="font-mono">{org.code}</span> },
            { label: 'Type', value: <Badge label={org.orgType} variant="info" /> },
            {
              label: 'Status',
              value: (
                <Badge
                  label={org.isActive ? 'Active' : 'Inactive'}
                  variant={org.isActive ? 'success' : 'neutral'}
                />
              ),
            },
            { label: 'Contact Email', value: org.contactEmail },
            { label: 'Contact Phone', value: org.contactPhone },
            { label: 'Created', value: new Date(org.createdAt).toLocaleDateString() },
          ]}
        />

        {/* Users table */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Users ({users.length})</h2>
            <Link
              href={`/organizations/${id}/users/new`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              + Add user
            </Link>
          </div>
          {users.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  {canManage && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <Badge label={u.role.replace(/_/g, ' ')} variant="info" />
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        label={u.isActive ? 'Active' : 'Inactive'}
                        variant={u.isActive ? 'success' : 'neutral'}
                      />
                    </td>
                    {canManage && (
                      <td className="px-6 py-3 text-right">
                        {u.isActive && (
                          <DeactivateUserButton
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
          )}
        </div>
      </div>

      {/* Related cross-connect orders */}
      <div className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Cross-Connect Orders</h2>
          <p className="mt-1 text-sm text-gray-400">
            View all orders for this organization via{' '}
            <Link href={`/orders?orgId=${id}`} className="text-brand-600 hover:underline">
              the orders list
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
