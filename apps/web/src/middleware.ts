import { auth } from '@/lib/auth/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Routes publicly accessible without a session
const PUBLIC_PATHS = ['/login'];

// Operator-only routes — customer roles are never allowed here
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

// Routes that require customer_admin specifically
const CUSTOMER_ADMIN_REQUIRED_PREFIXES = ['/portal/team'];

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
    const destination = role?.startsWith('customer') ? '/portal' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!session) return NextResponse.next();

  const role = (session.user as any)?.role as string | undefined;
  const isCustomer = role?.startsWith('customer') ?? false;
  const isOperator = !isCustomer;

  // ── Block customer roles from all operator routes ─────────────────────────
  if (isCustomer && OPERATOR_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // ── Block operator roles from customer portal ─────────────────────────────
  if (isOperator && pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── customer_viewer: read-only — block mutation-oriented pages ────────────
  if (role === 'customer_viewer') {
    const blocked =
      CUSTOMER_ORDERER_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p)) ||
      CUSTOMER_ADMIN_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
    if (blocked) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  // ── customer_orderer: can place orders but cannot manage team ─────────────
  if (role === 'customer_orderer') {
    if (CUSTOMER_ADMIN_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
