import { PageHeader } from '@/components/ui/page-header';
import { spSupportApi } from '@/lib/api/sp-support';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Support — SP Portal' };

const TICKET_STATUS_COLOR: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default async function SpSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const isAdmin = role === 'super_admin' || role === 'sp_admin';

  const page = Number(sp.page ?? '1');

  const [contact, result] = await Promise.all([
    spSupportApi.getContact(token).catch(() => null),
    spSupportApi
      .listTickets(token, { status: sp.status as any, page, limit: 25 })
      .catch(() => ({ data: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } })),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        subtitle="Manage support tickets and contact information"
        actions={
          <Link
            href="/sp/support/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New Ticket
          </Link>
        }
      />

      {/* Contact Details */}
      {contact && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Contact Our Team</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contact.name && <Detail label="Name" value={contact.name} />}
            {contact.email && (
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
                <dd className="mt-0.5 text-sm">
                  <a href={`mailto:${contact.email}`} className="text-brand-600 hover:underline">
                    {contact.email}
                  </a>
                </dd>
              </div>
            )}
            {contact.phone && <Detail label="Phone" value={contact.phone} />}
            {contact.hours && <Detail label="Hours" value={contact.hours} />}
          </dl>
        </div>
      )}

      {/* Filter */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          Filter
        </button>
      </form>

      {/* Ticket list */}
      {result.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No tickets found
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Subject', 'Category', 'Priority', 'Status', 'Created'].map((h) => (
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
                {result.data.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-gray-400">
                      {t.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      <Link href={`/sp/support/${t.id}`} className="text-brand-600 hover:underline">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600 capitalize">
                      {t.category}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[t.priority] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLOR[t.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
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

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}
