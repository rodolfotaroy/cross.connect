import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/status-badge';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; orgType?: string; search?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Number(params.page ?? '1');
  const result = await orgsApi
    .list(token, {
      page,
      limit: 25,
      orgType: params.orgType as any,
      search: params.search,
    })
    .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle={`${result.meta.total} total`}
        actions={
          <Link
            href="/organizations/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New Organization
          </Link>
        }
      />

      {/* Filters */}
      <form method="GET" className="mb-6 flex gap-3">
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search name or code…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          name="orgType"
          defaultValue={params.orgType ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All types</option>
          <option value="customer">Customer</option>
          <option value="carrier">Carrier</option>
          <option value="operator">Operator</option>
          <option value="cloud_provider">Cloud Provider</option>
          <option value="exchange">Exchange</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
        <a
          href="/organizations"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Clear
        </a>
      </form>

      {result.data.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description="Try adjusting your filters or create a new organization."
          action={{ label: '+ New Organization', href: '/organizations/new' }}
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
                    Code
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.data.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link
                        href={`/organizations/${org.id}`}
                        className="hover:text-brand-600 hover:underline"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{org.code}</td>
                    <td className="px-6 py-4">
                      <Badge label={org.orgType} variant="info" />
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-gray-600">
                      {org.contactEmail ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        label={org.isActive ? 'Active' : 'Inactive'}
                        variant={org.isActive ? 'success' : 'neutral'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.meta.total > result.meta.limit && (
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm text-gray-600">
              <span>
                Showing {(result.meta.page - 1) * result.meta.limit + 1}–
                {Math.min(result.meta.page * result.meta.limit, result.meta.total)} of{' '}
                {result.meta.total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}${params.orgType ? `&orgType=${params.orgType}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {result.meta.total > page * result.meta.limit && (
                  <Link
                    href={`?page=${page + 1}${params.orgType ? `&orgType=${params.orgType}` : ''}${params.search ? `&search=${params.search}` : ''}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
