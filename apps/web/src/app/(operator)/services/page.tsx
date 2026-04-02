import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, ServiceStateBadge } from '@/components/ui/status-badge';
import { servicesApi } from '@/lib/api/services';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; state?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const page = Math.max(1, Number(sp.page ?? '1'));

  const result = await servicesApi
    .list(token, { page, limit: 25, state: sp.state, q: sp.q })
    .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } }));

  return (
    <div>
      <PageHeader title="Active Services" subtitle={`${result.meta.total} total`} />

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search service number…"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm w-52"
        />
        <label htmlFor="filter-state" className="sr-only">
          Filter by state
        </label>
        <select
          id="filter-state"
          name="state"
          defaultValue={sp.state ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          <option value="provisioning">Provisioning</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_disconnect">Pending Disconnect</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Search
        </button>
        {(sp.state || sp.q) && (
          <a href="/services" className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </a>
        )}
      </form>

      {result.data.length === 0 ? (
        <EmptyState
          title="No services found"
          description="Services are created when cross-connect orders are approved and provisioned."
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
                    Service #
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Temporary
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Activated
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Expires
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    A-Side
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left font-medium uppercase tracking-wide text-gray-500"
                  >
                    Z-Side
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.data.map((svc) => {
                  const aSide = svc.endpoints.find((e) => e.endpointSide === 'a_side');
                  const zSide = svc.endpoints.find((e) => e.endpointSide === 'z_side');
                  return (
                    <tr key={svc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-semibold">
                        <Link
                          href={`/services/${svc.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {svc.serviceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <ServiceStateBadge state={svc.state} />
                      </td>
                      <td className="px-6 py-4">
                        {svc.isTemporary ? <Badge label="Temp" variant="warn" /> : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {svc.activatedAt ? new Date(svc.activatedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {svc.expiresAt ? new Date(svc.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 max-w-[130px] truncate text-gray-600 text-xs">
                        {aSide?.organizationName ?? aSide?.endpointType ?? '—'}
                      </td>
                      <td className="px-6 py-4 max-w-[130px] truncate text-gray-600 text-xs">
                        {zSide?.organizationName ?? zSide?.endpointType ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {result.meta.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/services?page=${page - 1}${sp.state ? `&state=${sp.state}` : ''}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`}
              className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              ← Prev
            </a>
          )}
          {Array.from({ length: result.meta.totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === result.meta.totalPages)
            .map((p, idx, arr) => (
              <>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span key={`e-${p}`} className="px-2 py-1 text-sm text-gray-400">
                    …
                  </span>
                )}
                <a
                  key={p}
                  href={`/services?page=${p}${sp.state ? `&state=${sp.state}` : ''}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`}
                  className={`px-3 py-1 rounded-md text-sm border ${
                    p === page
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </a>
              </>
            ))}
          {page < result.meta.totalPages && (
            <a
              href={`/services?page=${page + 1}${sp.state ? `&state=${sp.state}` : ''}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ''}`}
              className="px-3 py-1 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
