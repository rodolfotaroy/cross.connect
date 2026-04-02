/**
 * tests/global-setup.ts
 *
 * Runs once before the entire test suite.  Checks that the NestJS API is
 * reachable and the database is seeded before any test tries to log in.
 * Produces a clear, actionable error message rather than 6 × 20-second timeouts.
 *
 * Also pre-fetches seed IDs and writes them to .playwright/seeds.json so that
 * test workers read the file instead of each making their own auth+API calls
 * (which would exceed the login rate limit of 10 req/min).
 */
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3100';

export default async function globalSetup() {
  // ── 1. Check API is reachable ─────────────────────────────────────────────
  let apiReachable = false;
  try {
    // POST to the login endpoint with dummy data — any HTTP response (even 400/
    // 401) confirms the API is up and responding. A connection error means it's down.
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'probe@probe.local', password: 'probe' }),
      signal: AbortSignal.timeout(5_000),
    });
    apiReachable = res.status < 500; // 400/422 = API up, credentials wrong (expected)
  } catch {
    apiReachable = false;
  }

  if (!apiReachable) {
    throw new Error(
      [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║  Playwright pre-flight check FAILED                          ║',
        '╠══════════════════════════════════════════════════════════════╣',
        `║  NestJS API is not running at ${API_URL.padEnd(32)}║`,
        '║                                                              ║',
        '║  Start it in a separate terminal before running tests:       ║',
        '║                                                              ║',
        '║    cd C:\\Apps\\office_tools\\cross_connect                     ║',
        '║    pnpm --filter @xc/api dev                                 ║',
        '║                                                              ║',
        '║  Also ensure PostgreSQL is running (docker compose up -d)    ║',
        '╚══════════════════════════════════════════════════════════════╝',
        '',
      ].join('\n'),
    );
  }

  // ── 2. Verify seed data exists (login with a known seed account) ──────────
  let adminToken: string | null = null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@crossconnect.local',
        password: 'changeme123!',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = (await res.json()) as { accessToken: string };
      adminToken = data.accessToken;
    }
  } catch {
    adminToken = null;
  }

  if (!adminToken) {
    throw new Error(
      [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║  Playwright pre-flight check FAILED                          ║',
        '╠══════════════════════════════════════════════════════════════╣',
        '║  Cannot log in as admin@crossconnect.local                   ║',
        '║  The database is probably empty — run the seed script:       ║',
        '║                                                              ║',
        '║    cd C:\\Apps\\office_tools\\cross_connect                     ║',
        '║    pnpm db:seed                                              ║',
        '╚══════════════════════════════════════════════════════════════╝',
        '',
      ].join('\n'),
    );
  }

  console.log('  ✓ API is reachable and seed data verified');

  // ── 3. Pre-fetch seed IDs once so test workers don't each call the API ────
  try {
    const seeds = await fetchSeedsData(adminToken);
    const outDir = path.resolve(process.cwd(), '.playwright');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'seeds.json'), JSON.stringify(seeds, null, 2), 'utf-8');
    console.log('  ✓ Seed IDs written to .playwright/seeds.json');
  } catch (e) {
    // Non-fatal: tests will fall back to fetching seeds themselves.
    console.warn('  ⚠ Could not pre-fetch seeds:', (e as Error).message);
  }
}

async function apiGet(token: string, endpoint: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
  } catch { return []; }
}

async function apiGetFirst(token: string, endpoint: string): Promise<string | null> {
  const items = await apiGet(token, endpoint);
  return (items[0] as any)?.id ?? null;
}

async function fetchSeedsData(token: string) {
  const [orders, services, workOrders, orgs, sites] = await Promise.all([
    apiGet(token, '/api/v1/cross-connects/orders'),
    apiGet(token, '/api/v1/cross-connects/services'),
    apiGet(token, '/api/v1/work-orders'),
    apiGet(token, '/api/v1/organizations'),
    apiGet(token, '/api/v1/locations/sites'),
  ]);

  let firstBuildingId: string | null = null;
  let buildingSiteId: string | null = null;
  for (const site of sites) {
    const bId = await apiGetFirst(token, `/api/v1/locations/sites/${site.id}/buildings`);
    if (bId) { firstBuildingId = bId; buildingSiteId = site.id; break; }
  }

  const siteIdForHierarchy = buildingSiteId ?? (sites[0] as any)?.id ?? null;
  const firstRoomId = firstBuildingId
    ? await apiGetFirst(token, `/api/v1/locations/buildings/${firstBuildingId}/rooms`)
    : null;

  let firstRackId: string | null = null;
  let rackRoomId: string | null = null;
  if (firstBuildingId) {
    const rooms = await apiGet(token, `/api/v1/locations/buildings/${firstBuildingId}/rooms`);
    for (const room of rooms) {
      const rId = await apiGetFirst(token, `/api/v1/locations/rooms/${room.id}/racks`);
      if (rId) { firstRackId = rId; rackRoomId = room.id; break; }
    }
  }

  const firstPanelId = firstRackId
    ? await apiGetFirst(token, `/api/v1/locations/racks/${firstRackId}/panels`)
    : null;

  return {
    firstOrderId: (orders[0] as any)?.id ?? null,
    firstServiceId: (services[0] as any)?.id ?? null,
    firstWorkOrderId: (workOrders[0] as any)?.id ?? null,
    firstOrgId: (orgs[0] as any)?.id ?? null,
    firstSiteId: siteIdForHierarchy,
    firstBuildingId,
    firstRoomId: rackRoomId ?? firstRoomId,
    firstRackId,
    firstPanelId,
  };
}
