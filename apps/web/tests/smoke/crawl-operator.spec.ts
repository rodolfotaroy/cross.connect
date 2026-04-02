/**
 * tests/smoke/crawl-operator.spec.ts
 *
 * BFS smoke crawl for operator roles: super_admin, ops_manager, ops_technician.
 *
 * Each test:
 *  1. Seeds a small set of concrete URLs (list pages + any known detail pages
 *     resolved via the seeds helper).
 *  2. Runs the BFS crawler which follows internal links up to maxDepth hops.
 *  3. Asserts that no visited page has HTTP 4xx/5xx, JS exceptions, or
 *     critical console/network errors.
 *
 * Projects that run this spec (from playwright.config.ts):
 *   super-admin, ops-manager, ops-technician
 *
 * The active storageState (injected by the project config) determines which
 * role the page is authenticated as — this single spec therefore gives
 * three independent role coverage passes.
 */
import { expect, test } from '@playwright/test';
import { BASE_URL } from '../../playwright.config';
import { assertNoCrawlFailures, crawl } from '../helpers/crawler';
import { fetchSeeds } from '../helpers/seeds';

// ── Operator seed routes (all list / dashboard pages) ────────────────────────
const OPERATOR_SEED_PATHS = [
  '/dashboard',
  '/orders',
  '/orders/new',
  '/work-orders',
  '/services',
  '/inventory',
  '/locations',
  '/locations/new',
  '/approvals',
  '/audit',
  '/organizations',
  '/organizations/new',
  '/billing',
];

// Extra patterns to skip that are specific to the operator portal.
// We never want to follow deactivate / delete buttons or sign-out links.
const OPERATOR_EXTRA_EXCLUDE: RegExp[] = [/\/deactivate/, /\/delete/, /\/api\/auth/];

test.describe('Operator portal — BFS smoke crawl', () => {
  test('all operator pages load without errors', async ({ page, baseURL }) => {
    // This test crawls the full operator portal (locations, organizations, etc.)
    // which can exceed 30 pages. Give it enough headroom.
    test.setTimeout(180_000);
    const base = baseURL ?? BASE_URL;
    const seeds = await fetchSeeds();

    const seedPaths = [...OPERATOR_SEED_PATHS];

    if (seeds.firstOrderId) seedPaths.push(`/orders/${seeds.firstOrderId}`);
    if (seeds.firstWorkOrderId) seedPaths.push(`/work-orders/${seeds.firstWorkOrderId}`);
    if (seeds.firstServiceId) seedPaths.push(`/services/${seeds.firstServiceId}`);
    if (seeds.firstOrgId) {
      seedPaths.push(`/organizations/${seeds.firstOrgId}`);
      seedPaths.push(`/organizations/${seeds.firstOrgId}/edit`);
    }
    if (seeds.firstSiteId) {
      seedPaths.push(`/locations/${seeds.firstSiteId}`);
      seedPaths.push(`/locations/${seeds.firstSiteId}/edit`);
      seedPaths.push(`/inventory?siteId=${seeds.firstSiteId}`);
    }
    if (seeds.firstSiteId && seeds.firstBuildingId) {
      seedPaths.push(`/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}`);
      seedPaths.push(`/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/edit`);
    }
    if (seeds.firstSiteId && seeds.firstBuildingId && seeds.firstRoomId) {
      seedPaths.push(
        `/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/rooms/${seeds.firstRoomId}`,
      );
      seedPaths.push(
        `/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/rooms/${seeds.firstRoomId}/edit`,
      );
      seedPaths.push(`/inventory?roomId=${seeds.firstRoomId}`);
    }
    if (
      seeds.firstSiteId &&
      seeds.firstBuildingId &&
      seeds.firstRoomId &&
      seeds.firstRackId &&
      seeds.firstPanelId
    ) {
      seedPaths.push(
        `/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/rooms/${seeds.firstRoomId}/racks/${seeds.firstRackId}/panels/${seeds.firstPanelId}/edit`,
      );
      seedPaths.push(`/inventory?rackId=${seeds.firstRackId}`);
    }

    const results = await crawl(page, base, seedPaths, {
      maxDepth: 2,
      maxPages: 150,
      extraExcludePatterns: OPERATOR_EXTRA_EXCLUDE,
    });

    expect(results.length).toBeGreaterThanOrEqual(OPERATOR_SEED_PATHS.length - 2);
    assertNoCrawlFailures(results);
  });

  // ── Spot-check: individual critical pages ──────────────────────────────────

  test('dashboard page renders heading', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/dashboard`);
    await expect(page.locator('h1, h2, [data-testid="dashboard"]').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('orders list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/orders`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('work-orders list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/work-orders`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('services list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/services`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('inventory page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/inventory`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('inventory with siteId filter loads', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstSiteId, 'No seed site available');
    await page.goto(`${baseURL ?? BASE_URL}/inventory?siteId=${seeds.firstSiteId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('inventory with roomId filter loads', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstRoomId, 'No seed room available');
    await page.goto(`${baseURL ?? BASE_URL}/inventory?roomId=${seeds.firstRoomId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('inventory with rackId filter loads', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstRackId, 'No seed rack available');
    await page.goto(`${baseURL ?? BASE_URL}/inventory?rackId=${seeds.firstRackId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('locations list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/locations`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('approvals page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/approvals`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('audit log page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/audit`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('organizations list page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/organizations`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('billing page loads', async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? BASE_URL}/billing`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('order detail page loads when order exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstOrderId, 'No seed order available');
    await page.goto(`${baseURL ?? BASE_URL}/orders/${seeds.firstOrderId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('service detail page loads when service exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstServiceId, 'No seed service available');
    await page.goto(`${baseURL ?? BASE_URL}/services/${seeds.firstServiceId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('work-order detail page loads when work-order exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstWorkOrderId, 'No seed work-order available');
    await page.goto(`${baseURL ?? BASE_URL}/work-orders/${seeds.firstWorkOrderId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('site detail page loads when site exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstSiteId, 'No seed site available');
    await page.goto(`${baseURL ?? BASE_URL}/locations/${seeds.firstSiteId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });

  test('building detail page loads when building exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstSiteId || !seeds.firstBuildingId, 'No seed building available');
    await page.goto(
      `${baseURL ?? BASE_URL}/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}`,
    );
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('room detail page loads when room exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(
      !seeds.firstSiteId || !seeds.firstBuildingId || !seeds.firstRoomId,
      'No seed room available',
    );
    await page.goto(
      `${baseURL ?? BASE_URL}/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/rooms/${seeds.firstRoomId}`,
    );
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('rack panel edit page loads when panel exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(
      !seeds.firstSiteId ||
        !seeds.firstBuildingId ||
        !seeds.firstRoomId ||
        !seeds.firstRackId ||
        !seeds.firstPanelId,
      'No seed panel available',
    );
    await page.goto(
      `${baseURL ?? BASE_URL}/locations/${seeds.firstSiteId}/buildings/${seeds.firstBuildingId}/rooms/${seeds.firstRoomId}/racks/${seeds.firstRackId}/panels/${seeds.firstPanelId}/edit`,
    );
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('organization detail page loads when org exists', async ({ page, baseURL }) => {
    const seeds = await fetchSeeds();
    test.skip(!seeds.firstOrgId, 'No seed organisation available');
    await page.goto(`${baseURL ?? BASE_URL}/organizations/${seeds.firstOrgId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('text=500')).not.toBeVisible();
  });
});
