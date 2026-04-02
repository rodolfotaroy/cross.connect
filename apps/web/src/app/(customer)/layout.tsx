import { CollapsibleSidebar } from '@/components/ui/collapsible-sidebar';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Customer Portal' };

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as any;
  const allowedRoles = ['customer_admin', 'customer_orderer', 'customer_viewer'];
  if (!allowedRoles.includes(user?.role)) redirect('/dashboard');

  const canPlaceOrders = ['customer_admin', 'customer_orderer'].includes(user?.role);
  const isAdmin = user?.role === 'customer_admin';
  const navItems = [
    { href: '/portal/orders', label: 'My Orders' },
    ...(canPlaceOrders ? [{ href: '/portal/orders/new', label: 'Request Cross-Connect' }] : []),
    { href: '/portal/services', label: 'Active Services' },
    ...(isAdmin ? [{ href: '/portal/team', label: 'My Team' }] : []),
  ];

  return (
    <div className="flex min-h-screen">
      <CollapsibleSidebar
        title="CrossConnect"
        subtitle="Customer Portal"
        navItems={navItems}
        userLine1={user?.name ?? user?.email}
        userLine2={user?.orgName ?? (user?.orgId ? `Org: ${user.orgId.slice(0, 8)}…` : undefined)}
      />
      <main className="min-w-0 flex-1 overflow-auto bg-gray-50 px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pr-8 lg:pt-6">{children}</main>
    </div>
  );
}
