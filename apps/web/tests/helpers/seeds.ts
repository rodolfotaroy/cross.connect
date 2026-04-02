/**
 * tests/helpers/seeds.ts
 *
 * Fetches known resource IDs from the API using super-admin credentials so
 * that tests can build concrete URLs for dynamic routes (e.g. /orders/[id]).
 *
 * global-setup.ts pre-fetches seeds once and writes .playwright/seeds.json.
 * Workers read that file (avoiding multiple login calls that trip the rate
 * limiter). Falls back to fetching from the API if the file is missing.
 *
 * Usage:
 *   const seeds = await fetchSeeds();
 *   await page.goto(`/orders/${seeds.firstOrderId}`);
 */

import * as fs from 'fs';
import * as path from 'path';
import { API_URL } from '../../playwright.config';

const SEEDS_FILE = path.resolve(process.cwd(), '.playwright', 'seeds.json');

export interface SeedData {
  /** First available order ID (any state) */
  firstOrderId: string | null;
  /** First active service ID */
  firstServiceId: string | null;
  /** First work-order ID */
  firstWorkOrderId: string | null;
  /** First customer organisation ID */
  firstOrgId: string | null;
  /** First site ID */
  firstSiteId: string | null;
  /** First building ID (under firstSiteId) */
  firstBuildingId: string | null;
  /** First room ID (under firstBuildingId) */
  firstRoomId: string | null;
  /** First standalone rack ID (under firstRoomId) */
  firstRackId: string | null;
  /** First panel ID (under firstRackId) */
  firstPanelId: string | null;
}

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@crossconnect.local',
      password: 'changeme123!',
    }),
  });

  if (!res.ok) {
    throw new Error(
      `seeds.ts: Failed to authenticate as super_admin (${res.status}). ` +
        'Is the API server running on ' +
        API_URL +
        '?',
    );
  }

  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function getFirstId(token: string, endpoint: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    // Handle both array responses and paginated { data: [...] } shapes.
    const items = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
    return (items[0] as any)?.id ?? null;
  } catch {
    return null;
  }
}

async function getItems(token: string, endpoint: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
  } catch {
    return [];
  }
}

let cached: SeedData | null = null;

/**
 * Fetch seed IDs once and cache for the lifetime of the test worker.
 * Reads from .playwright/seeds.json (written by global-setup) when available,
 * so the API login endpoint is only called once per full test run, not once
 * per worker (which would hit the 10 req/min rate limit).
 */
export async function fetchSeeds(): Promise<SeedData> {
  if (cached) return cached;

  // Try the pre-fetched file first (written by global-setup.ts).
  try {
    const raw = fs.readFileSync(SEEDS_FILE, 'utf-8');
    cached = JSON.parse(raw) as SeedData;
    return cached;
  } catch {
    // File not present — fall back to fetching from the API.
  }

  const token = await getAdminToken();

  const [firstOrderId, firstServiceId, firstWorkOrderId, firstOrgId, sites] = await Promise.all([
    getFirstId(token, '/api/v1/cross-connects/orders'),
    getFirstId(token, '/api/v1/cross-connects/services'),
    getFirstId(token, '/api/v1/work-orders'),
    getFirstId(token, '/api/v1/organizations'),
    getItems(token, '/api/v1/locations/sites'),
  ]);

  const firstSiteId = (sites[0] as any)?.id ?? null;

  // Find a site that has buildings (not all sites have them).
  let firstBuildingId: string | null = null;
  let buildingSiteId: string | null = null;
  for (const site of sites) {
    const buildingId = await getFirstId(token, `/api/v1/locations/sites/${site.id}/buildings`);
    if (buildingId) {
      firstBuildingId = buildingId;
      buildingSiteId = site.id;
      break;
    }
  }

  // Use the site that has the building for the location hierarchy context.
  // If no building was found, fall back to the first site.
  const siteIdForHierarchy = buildingSiteId ?? firstSiteId;

  const firstRoomId = firstBuildingId
    ? await getFirstId(token, `/api/v1/locations/buildings/${firstBuildingId}/rooms`)
    : null;

  // Find a room that has racks.
  let firstRackId: string | null = null;
  let rackRoomId: string | null = null;
  if (firstBuildingId) {
    const rooms = await getItems(token, `/api/v1/locations/buildings/${firstBuildingId}/rooms`);
    for (const room of rooms) {
      const rackId = await getFirstId(token, `/api/v1/locations/rooms/${room.id}/racks`);
      if (rackId) {
        firstRackId = rackId;
        rackRoomId = room.id;
        break;
      }
    }
  }

  const firstPanelId = firstRackId
    ? await getFirstId(token, `/api/v1/locations/racks/${firstRackId}/panels`)
    : null;

  cached = {
    firstOrderId,
    firstServiceId,
    firstWorkOrderId,
    firstOrgId,
    firstSiteId: siteIdForHierarchy,
    firstBuildingId,
    firstRoomId: rackRoomId ?? firstRoomId,
    firstRackId,
    firstPanelId,
  };

  return cached;
}
