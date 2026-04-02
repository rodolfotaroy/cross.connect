import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import Link from 'next/link';

export default async function LocationsPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const sites = await sitesApi.list(token).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Sites and physical infrastructure"
        actions={
          <Link
            href="/locations/new"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New Site
          </Link>
        }
      />

      {sites.length === 0 ? (
        <EmptyState
          title="No sites configured"
          description="Add your first datacenter site to start managing physical infrastructure."
          action={{ label: '+ New Site', href: '/locations/new' }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/locations/${site.id}`}
              className="group rounded-lg border border-gray-200 bg-white p-6 hover:border-brand-500 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {site.code}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-brand-700">
                    {site.name}
                  </h3>
                </div>
                <svg className="h-5 w-5 text-gray-300 group-hover:text-brand-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {site.city}, {site.country}
              </p>
              {site.address && (
                <p className="mt-1 text-xs text-gray-400 truncate">{site.address}</p>
              )}
              <p className="mt-4 text-xs text-gray-400">
                Added {new Date(site.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
