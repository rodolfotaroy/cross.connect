import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Service Partner Portal' };

const SP_ROLES = ['sp_admin', 'sp_ops', 'sp_viewer', 'sp_report'];

export default async function SpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as any;
  if (!SP_ROLES.includes(user?.role)) redirect('/login');

  const role: string = user?.role;
  const isAdmin = role === 'sp_admin';
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
        title={user?.orgName ?? 'SP Portal'}
        subtitle="Service Partner Portal"
        navItems={navItems}
        userLine1={user?.name ?? user?.email}
        userLine2={user?.orgName ?? (user?.orgId ? `Org: ${user.orgId.slice(0, 8)}…` : undefined)}
      />
      <main className="min-w-0 flex-1 overflow-auto bg-gray-50 px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pr-8 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
