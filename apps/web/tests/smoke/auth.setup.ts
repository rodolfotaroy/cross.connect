/**
 * tests/smoke/auth.setup.ts
 *
 * Logs in as every role and persists the browser storage state (cookies) to
 * .playwright/sessions/<role>.json.  These files are consumed by all spec
 * projects via `use: { storageState }` so that tests start already
 * authenticated, without repeating the full login flow.
 *
 * This file is matched by the "auth-setup" project in playwright.config.ts and
 * is guaranteed to run before any dependent spec project.
 *
 * SESSION CACHING: If a session file exists and is less than SESSION_TTL_MS
 * old, the login step is skipped and the existing file is reused.  This
 * prevents duplicate auth attempts when auth-setup is re-triggered as a
 * project dependency within the same test run (which causes the 5th/6th
 * sequential login in the same browser process to fail due to CSRF/connection
 * state accumulation in the Next-Auth middleware).
 */
import { expect, test as setup } from '@playwright/test';
import fs from 'fs';
import { SESSION_DIR, SESSIONS } from '../../playwright.config';

/** How long a cached session file is considered valid (15 minutes). */
const SESSION_TTL_MS = 15 * 60 * 1000;

// Ensure the session directory exists before any test runs.
setup.beforeAll(() => {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
});

/** Seed credentials that match packages/db/src/seed.ts */
const CREDENTIALS = [
  {
    key: 'super_admin' as const,
    email: 'admin@crossconnect.local',
    password: 'changeme123!',
    expectedDest: '/dashboard',
  },
  {
    key: 'ops_manager' as const,
    email: 'ops@crossconnect.local',
    password: 'changeme123!',
    expectedDest: '/dashboard',
  },
  {
    key: 'ops_technician' as const,
    email: 'tech@crossconnect.local',
    password: 'changeme123!',
    expectedDest: '/dashboard',
  },
  {
    key: 'customer_admin' as const,
    email: 'alice@acme.example.com',
    password: 'changeme123!',
    expectedDest: '/portal',
  },
  {
    key: 'customer_orderer' as const,
    email: 'bob@acme.example.com',
    password: 'changeme123!',
    expectedDest: '/portal',
  },
  {
    key: 'customer_viewer' as const,
    email: 'dave@acme.example.com',
    password: 'changeme123!',
    expectedDest: '/portal',
  },
] satisfies {
  key: keyof typeof SESSIONS;
  email: string;
  password: string;
  expectedDest: string;
}[];

for (const { key, email, password, expectedDest } of CREDENTIALS) {
  setup(`authenticate: ${key}`, async ({ page }) => {
    const sessionPath = SESSIONS[key];

    // Reuse a recently-created session file to avoid repeated logins in the
    // same Playwright process (sequential logins 5+ can fail due to CSRF
    // state accumulation in the Next-Auth dev server).
    if (fs.existsSync(sessionPath)) {
      const age = Date.now() - fs.statSync(sessionPath).mtimeMs;
      if (age < SESSION_TTL_MS) {
        console.log(
          `[auth-setup] Reusing cached session for ${key} (${Math.round(age / 1000)}s old)`,
        );
        return;
      }
    }

    await page.goto('/login');

    // Fill credentials using stable name selectors that match login-form.tsx.
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Confirm successful login — middleware redirects to the role''s home page.
    await page.waitForURL((url) => url.pathname.startsWith(expectedDest), { timeout: 20_000 });

    // Confirm no error message is visible on page.
    await expect(page.locator('text=Invalid email or password')).not.toBeVisible();

    // Persist the cookie jar so spec projects can reuse this session.
    await page.context().storageState({ path: SESSIONS[key] });
  });
}
