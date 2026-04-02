/**
 * tests/smoke/crawl-customer.spec.ts
 *
 * BFS smoke crawl for customer roles: customer_admin, customer_orderer,
 * customer_viewer.
 *
 * Projects that run this spec (from playwright.config.ts):
 *   customer-admin, customer-orderer, customer-viewer
 *
 * StorageState is injected per-project so the same spec runs three times,
 * once per customer role, each with different RBAC permissions.
 */
import { expect, test } from '@playwright/test';
import { BASE_URL } from '../../playwright.config';
import { assertNoCrawlFailures, crawl } from '../helpers/crawler';
import { fetchSeeds } from '../helpers/seeds';

// ── Customer portal seed routes ───────────────────────────────────────────────
const CUSTOMER_BASE_SEEDS = ['/portal', '/portal/orders', '/portal/services'];

// Only valid for customer_admin
const CUSTOMER_ADMIN_ONLY_SEEDS = ['/portal/team', '/portal/team/new'];

// Valid for customer_admin and customer_orderer, not customer_viewer
const CUSTOMER_ORDERER_SEEDS = ['/portal/orders/new'];

// Extra patterns to skip in the customer portal.
const CUSTOMER_EXTRA_EXCLUDE: RegExp[] = [/\/deactivate/, /\/delete/, /\/api\/auth/];

test.describe('Customer portal — BFS smoke crawl', () => {
  test('base customer pages load without errors', async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const base = baseURL ?? BASE_URL;
    const seeds = await fetchSeeds();

    const seedPaths = [
      ...CUSTOMER_BASE_SEEDS,
      ...CUSTOMER_ADMIN_ONLY_SEEDS,
      ...CUSTOMER_ORDERER_SEEDS,
    ];

    if (seeds.firstOrderId) {
      seedPaths.push(`/portal/orders/${seeds.firstOrderId}`);
    }
    if (seeds.firstServiceId) {
      seedPaths.push(`/portal/services/${seeds.firstServiceId}`);
    }

    const results = await crawl(page, base, seedPaths, {
      maxDepth: 2,
      maxPages: 80,
      extraExcludePatterns: CUSTOMER_EXTRA_EXCLUDE,
    });

    expect(results.length).toBeGreaterThanOrEqual(1);
    assertNoCrawlFailures(results);
  });

  // ── Spot-check: individual customer pages ─────────────────────────────────

  test('customer portal dashboard loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('customer orders list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/orders`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('customer services list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/portal/services`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('customer order detail page loads when order exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstOrderId, 'No seed order available');
    await page.goto(`${baseURL ?? BASE_URL}/portal/orders/${seeds.firstOrderId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('customer service detail page loads when service exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstServiceId, 'No seed service available');
    await page.goto(`${baseURL ?? BASE_URL}/portal/services/${seeds.firstServiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('new order form page loads (viewer/orderer role gating tested in route-protection)', async ({
    page,
    baseURL,
  }) => {
    const res = await page.goto(`${baseURL ?? BASE_URL}/portal/orders/new`);
    await page.waitForLoadState('domcontentloaded');
    const finalPath = new URL(page.url()).pathname;
    // Either stayed on /portal/orders/new (orderer/admin) or redirected to /portal (viewer).
    expect(['/portal/orders/new', '/portal']).toContain(finalPath);
    expect(res?.status()).not.toBeGreaterThanOrEqual(500);
  });

  test('team management page loads for customer_admin (others redirected)', async ({
    page,
    baseURL,
  }) => {
    const res = await page.goto(`${baseURL ?? BASE_URL}/portal/team`);
    await page.waitForLoadState('domcontentloaded');
    const finalPath = new URL(page.url()).pathname;
    // Either stayed on /portal/team (admin) or redirected to /portal (others).
    expect(['/portal/team', '/portal']).toContain(finalPath);
    expect(res?.status()).not.toBeGreaterThanOrEqual(500);
  });
});
