/**
 * tests/smoke/route-protection.spec.ts
 *
 * Verifies that the middleware (apps/web/src/middleware.ts) correctly
 * enforces RBAC route protection for every role combination.
 *
 * This spec runs under a SINGLE Playwright project (super-admin) but each
 * describe block pins its own storageState via test.use(), ensuring the
 * correct session is used for every role without running the whole file 4×.
 */
import { expect, test } from '@playwright/test';
import { BASE_URL, SESSIONS } from '../../playwright.config';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertRedirectsTo(
  page: import('@playwright/test').Page,
  fromPath: string,
  expectedDestination: string,
  base = BASE_URL,
) {
  await page.goto(`${base}${fromPath}`);
  await page.waitForLoadState('domcontentloaded');
  const finalPath = new URL(page.url()).pathname;
  expect(finalPath).toBe(expectedDestination);
}

// ── Unauthenticated (no project storageState) ─────────────────────────────────
// Uses a separate anonymous context — these tests run under the super-admin
// project but navigate in a fresh context with no cookies.
test.describe('Unauthenticated access → /login redirect', () => {
  test('unauthenticated visit to /dashboard redirects to /login', async ({ browser, baseURL }) => {
    // Create a brand-new context with no stored auth cookies.
    const ctx = await browser.newContext({ storageState: undefined });
    const freshPage = await ctx.newPage();
    try {
      await freshPage.goto(`${baseURL ?? BASE_URL}/dashboard`);
      await freshPage.waitForLoadState('domcontentloaded');
      const finalPath = new URL(freshPage.url()).pathname;
      expect(finalPath).toBe('/login');
    } finally {
      await ctx.close();
    }
  });

  test('unauthenticated visit to /portal redirects to /login', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const freshPage = await ctx.newPage();
    try {
      await freshPage.goto(`${baseURL ?? BASE_URL}/portal`);
      await freshPage.waitForLoadState('domcontentloaded');
      const finalPath = new URL(freshPage.url()).pathname;
      expect(finalPath).toBe('/login');
    } finally {
      await ctx.close();
    }
  });

  test('unauthenticated visit to /login stays on /login', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const freshPage = await ctx.newPage();
    try {
      await freshPage.goto(`${baseURL ?? BASE_URL}/login`);
      await freshPage.waitForLoadState('domcontentloaded');
      const finalPath = new URL(freshPage.url()).pathname;
      expect(finalPath).toBe('/login');
    } finally {
      await ctx.close();
    }
  });
});

// ── super_admin — operator portal access ─────────────────────────────────────
test.describe('super_admin — allowed on all operator routes', () => {
  test.use({ storageState: SESSIONS.super_admin });

  test('super_admin can access /dashboard', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/dashboard`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/dashboard');
  });

  test('super_admin redirected from /portal to /dashboard', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/portal', '/dashboard', baseURL ?? BASE_URL);
  });

  test('super_admin redirected from /login to /dashboard when already logged in', async ({
    page,
    baseURL,
  }) => {
    await assertRedirectsTo(page, '/login', '/dashboard', baseURL ?? BASE_URL);
  });
});

// ── customer_admin — customer portal + team management ───────────────────────
test.describe('customer_admin — access rules', () => {
  test.use({ storageState: SESSIONS.customer_admin });

  test('customer_admin can access /portal', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal');
  });

  test('customer_admin can access /portal/team', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/team`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal/team');
  });

  test('customer_admin can access /portal/orders/new', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/orders/new`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal/orders/new');
  });

  test('customer_admin redirected from /dashboard to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/dashboard', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_admin redirected from /orders to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/orders', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_admin redirected from /organizations to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/organizations', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_admin redirected from /billing to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/billing', '/portal', baseURL ?? BASE_URL);
  });
});

// ── customer_orderer — can order, cannot manage team ─────────────────────────
test.describe('customer_orderer — access rules', () => {
  test.use({ storageState: SESSIONS.customer_orderer });

  test('customer_orderer can access /portal', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal');
  });

  test('customer_orderer can access /portal/orders/new', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/orders/new`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal/orders/new');
  });

  test('customer_orderer redirected from /portal/team to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/portal/team', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_orderer redirected from /portal/team/new to /portal', async ({
    page,
    baseURL,
  }) => {
    await assertRedirectsTo(page, '/portal/team/new', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_orderer redirected from /dashboard to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/dashboard', '/portal', baseURL ?? BASE_URL);
  });
});

// ── customer_viewer — read-only, no orders/team creation ─────────────────────
test.describe('customer_viewer — access rules', () => {
  test.use({ storageState: SESSIONS.customer_viewer });

  test('customer_viewer can access /portal', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal');
  });

  test('customer_viewer can access /portal/orders', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/orders`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal/orders');
  });

  test('customer_viewer can access /portal/services', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/services`);
    await page.waitForLoadState('domcontentloaded');
    expect(new URL(page.url()).pathname).toBe('/portal/services');
  });

  test('customer_viewer redirected from /portal/orders/new to /portal', async ({
    page,
    baseURL,
  }) => {
    await assertRedirectsTo(page, '/portal/orders/new', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_viewer redirected from /portal/team to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/portal/team', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_viewer redirected from /portal/team/new to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/portal/team/new', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_viewer redirected from /dashboard to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/dashboard', '/portal', baseURL ?? BASE_URL);
  });

  test('customer_viewer redirected from /audit to /portal', async ({ page, baseURL }) => {
    await assertRedirectsTo(page, '/audit', '/portal', baseURL ?? BASE_URL);
  });
});
