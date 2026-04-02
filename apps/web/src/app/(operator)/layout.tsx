import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Operator Portal' };

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as any;
  const allowedRoles = ['super_admin', 'ops_manager', 'ops_technician'];
  if (!allowedRoles.includes(user?.role)) redirect('/portal');

  const canManageOrgs = ['super_admin', 'ops_manager'].includes(user?.role);
  const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/orders', label: 'Orders' },
    { href: '/approvals', label: 'Approvals Queue' },
    { href: '/work-orders', label: 'Work Orders' },
    { href: '/services', label: 'Services' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/locations', label: 'Locations' },
    { href: '/organizations', label: 'Organizations' },
    { href: '/billing', label: 'Billing Events' },
    { href: '/audit', label: 'Audit Log' },
    ...(canManageOrgs && user?.orgId
      ? [{ href: `/organizations/${user.orgId}`, label: 'My Team' }]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <CollapsibleSidebar
        title="CrossConnect"
        subtitle="Operator Portal"
        navItems={NAV_ITEMS}
        userLine1={user?.name ?? user?.email}
        userLine2={
          user?.orgName
            ? `${user.orgName} · ${user?.role?.replace(/_/g, ' ')}`
            : user?.role?.replace(/_/g, ' ')
        }
      />
      <main className="min-w-0 flex-1 overflow-auto bg-gray-50 px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pr-8 lg:pt-6">{children}</main>
    </div>
  );
}
