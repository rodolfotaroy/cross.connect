'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem {
  href: string;
  label: string;
}

interface Props {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  userLine1: string;
  userLine2?: string;
}

export function CollapsibleSidebar({ title, subtitle, navItems, userLine1, userLine2 }: Props) {
  // Desktop: collapsed = icon-only rail. Mobile: open = drawer visible.
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change / resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navContent = (isMobile: boolean) => (
    <>
      {/* Header */}
      <div
        className={`flex items-center border-b border-gray-700 ${
          !isMobile && collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-5 justify-between'
        }`}
      >
        {(isMobile || !collapsed) && (
          <div>
            <span className="text-lg font-semibold">{title}</span>
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          </div>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Close menu"
            aria-label="Close menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            {collapsed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.label];
          const iconOnly = !isMobile && collapsed;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={iconOnly ? item.label : undefined}
              aria-label={iconOnly ? item.label : undefined}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md text-sm transition-colors ${
                iconOnly ? 'justify-center px-2 py-2' : 'px-3 py-2'
              } ${
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-gray-100'
              }`}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {!iconOnly && <span className={isActive ? 'font-medium' : ''}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={`border-t border-gray-700 text-xs text-gray-400 ${
          !isMobile && collapsed ? 'px-2 py-3 flex flex-col items-center gap-2' : 'px-5 py-4'
        }`}
      >
        {(isMobile || !collapsed) && (
          <>
            <p className="truncate text-gray-300">{userLine1}</p>
            {userLine2 && <p className="capitalize mt-0.5 truncate text-gray-500">{userLine2}</p>}
          </>
        )}
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`flex items-center gap-2 text-gray-400 hover:text-gray-100 transition-colors ${
            !isMobile && collapsed ? '' : 'mt-2'
          }`}
        >
          <SignOutIcon className="h-4 w-4 shrink-0" />
          {(isMobile || !collapsed) && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 bg-gray-900 px-4 py-3 shadow-md">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          title="Open menu"
          aria-label="Open menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-semibold text-base">{title}</span>
        <span className="text-gray-400 text-xs">{subtitle}</span>
      </div>

      {/* ── Mobile drawer overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex" onClick={() => setMobileOpen(false)}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') setMobileOpen(false);
            }}
          />
          {/* Drawer */}
          <aside
            className="relative z-50 flex flex-col w-72 bg-gray-900 text-white h-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent(true)}
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col bg-gray-900 text-white shrink-0 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-64'
        }`}
      >
        {navContent(false)}
      </aside>
    </>
  );
}

// ── SVG icon components ───────────────────────────────────────────────────────

type SvgIcon = (props: { className?: string }) => React.ReactElement;

const DashboardIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
    />
  </svg>
);

const OrdersIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const ApprovalsIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WorkOrdersIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const ServicesIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const LocationsIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const OrganizationsIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const AuditIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
  </svg>
);

const BillingIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
);

const NewOrderIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const SignOutIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
    />
  </svg>
);

const InventoryIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);

const TeamIcon: SvgIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4 0a4 4 0 100-8 4 4 0 000 8zm6-8a3 3 0 11-6 0 3 3 0 016 0zM3 20v-2a3 3 0 013-3h1"
    />
  </svg>
);

const NAV_ICONS: Record<string, SvgIcon> = {
  Dashboard: DashboardIcon,
  Orders: OrdersIcon,
  'Approvals Queue': ApprovalsIcon,
  'Work Orders': WorkOrdersIcon,
  Services: ServicesIcon,
  Locations: LocationsIcon,
  Organizations: OrganizationsIcon,
  Inventory: InventoryIcon,
  'Audit Log': AuditIcon,
  'Billing Events': BillingIcon,
  'My Orders': OrdersIcon,
  'Request Cross-Connect': NewOrderIcon,
  'Active Services': ServicesIcon,
  'My Team': TeamIcon,
};
