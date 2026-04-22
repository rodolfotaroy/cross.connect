import { auth } from '@/lib/auth/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Routes publicly accessible without a session
const PUBLIC_PATHS = ['/login'];

// Operator-only routes — customer and SP roles are never allowed here
const OPERATOR_ONLY_PREFIXES = [
  '/dashboard',
  '/orders',
  '/work-orders',
  '/services',
  '/inventory',
  '/locations',
  '/approvals',
  '/audit',
  '/organizations',
  '/billing',
];

// Routes inside the customer portal that require elevated customer roles
// customer_viewer is blocked from all of these
const CUSTOMER_ORDERER_REQUIRED_PREFIXES = ['/portal/orders/new'];

// SP portal routes that require sp_admin specifically
const SP_ADMIN_ONLY_PREFIXES = ['/sp/organization'];

// SP portal routes that require sp_admin or sp_report
const SP_REPORT_REQUIRED_PREFIXES = ['/sp/reports'];

// SP mutation routes — blocked for sp_viewer and sp_report
const SP_WRITE_REQUIRED_PREFIXES = ['/sp/cross-connects/new'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const sessionError = (session as any)?.error;

  // ── Unauthenticated redirect ──────────────────────────────────────────────
  if (!isPublic && (!session || sessionError === 'RefreshTokenExpired')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Logged-in user visiting public page → send to their dashboard ─────────
  if (isPublic && session && !sessionError) {
    const role = (session.user as any)?.role as string | undefined;
    let destination = '/dashboard';
    if (role?.startsWith('customer')) destination = '/portal';
    else if (role?.startsWith('sp')) destination = '/sp';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!session) return NextResponse.next();

  const role = (session.user as any)?.role as string | undefined;
  const isCustomer = role?.startsWith('customer') ?? false;
  const isOperator = !isCustomer && !role?.startsWith('sp');
  const isSp = role?.startsWith('sp') ?? false;

  // ── Block customer and SP roles from all operator routes ──────────────────
  if ((isCustomer || isSp) && OPERATOR_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL(isSp ? '/sp' : '/portal', request.url));
  }

  // ── Block operator and SP roles from customer portal ──────────────────────
  if ((isOperator || isSp) && pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL(isOperator ? '/dashboard' : '/sp', request.url));
  }

  // ── Block non-SP roles from SP portal (super_admin is always allowed) ──────
  if (!isSp && role !== 'super_admin' && pathname.startsWith('/sp')) {
    const destination = isCustomer ? '/portal' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // ── SP portal: admin-only pages ───────────────────────────────────────────
  if (isSp && role !== 'sp_admin' && SP_ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/sp', request.url));
  }

  // ── SP portal: report pages require sp_admin or sp_report ─────────────────
  if (
    isSp &&
    role !== 'sp_admin' &&
    role !== 'sp_report' &&
    SP_REPORT_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/sp', request.url));
  }

  // ── SP portal: sp_viewer and sp_report cannot use write routes ────────────
  if (
    isSp &&
    (role === 'sp_viewer' || role === 'sp_report') &&
    SP_WRITE_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/sp/cross-connects', request.url));
  }

  // ── customer_viewer: read-only — block mutation-oriented pages ────────────
  if (role === 'customer_viewer') {
    const blocked = CUSTOMER_ORDERER_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
    if (blocked) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
