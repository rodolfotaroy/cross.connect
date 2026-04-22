import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Service Partner Portal' };

const SP_ROLES = ['sp_admin', 'sp_ops', 'sp_viewer', 'sp_report', 'super_admin'];

export default async function SpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as any;
  if (!SP_ROLES.includes(user?.role)) redirect('/login');

  const role: string = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'sp_admin' || isSuperAdmin;
  const canReport = isAdmin || role === 'sp_report';
  const canWrite = isAdmin || role === 'sp_ops';

  const navItems = [
    { href: '/sp', label: 'Dashboard' },
    { href: '/sp/cross-connects', label: 'Cross Connects' },
    ...(canReport ? [{ href: '/sp/reports', label: 'Reports' }] : []),
    ...(isAdmin ? [{ href: '/sp/organization', label: 'Organization' }] : []),
    { href: '/sp/support', label: 'Support' },
  ];

  return (
    <div className="flex min-h-screen">
      <CollapsibleSidebar
        title={isSuperAdmin ? 'SP Portal' : (user?.orgName ?? 'SP Portal')}
        subtitle={isSuperAdmin ? 'Viewing as Super Admin' : 'Service Partner Portal'}
        navItems={navItems}
        userLine1={user?.name ?? user?.email}
        userLine2={
          isSuperAdmin
            ? 'super_admin'
            : (user?.orgName ?? (user?.orgId ? `Org: ${user.orgId.slice(0, 8)}…` : undefined))
        }
      />
      <main className="min-w-0 flex-1 overflow-auto bg-gray-50 px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pr-8 lg:pt-6">
        {isSuperAdmin && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Viewing SP Portal as <strong>super_admin</strong> — all organizations visible.
            </span>
            <Link
              href="/dashboard"
              className="ml-auto whitespace-nowrap font-medium underline hover:text-amber-900"
            >
              ← Back to Operator Portal
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
