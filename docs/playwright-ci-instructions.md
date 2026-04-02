# Playwright E2E Smoke Test Suite — CI Instructions

## Overview

This directory contains a Playwright-based smoke test suite for the CrossConnect
web application. It covers:

| Category             | What it tests                                        |
| -------------------- | ---------------------------------------------------- |
| **Auth setup**       | Login flow for all 6 roles; persists session cookies |
| **Operator crawl**   | BFS crawl of all operator portal pages (3 roles)     |
| **Customer crawl**   | BFS crawl of all customer portal pages (3 roles)     |
| **Route protection** | RBAC redirect rules enforced by `middleware.ts`      |

---

## File Structure

```
apps/web/
├── playwright.config.ts          # Playwright configuration + project definitions
├── .playwright/
│   ├── sessions/                 # Generated auth state files (git-ignored)
│   ├── results/                  # Test artifacts (screenshots, traces)
│   └── report/                   # HTML report
└── tests/
    ├── helpers/
    │   ├── auth.ts               # Credential constants + loginAs() helper
    │   ├── seeds.ts              # Fetch seed resource IDs from the API
    │   ├── crawler.ts            # BFS crawl engine + assertNoCrawlFailures()
    │   └── safe-crawl-rules.ts  # URL exclusion patterns
    └── smoke/
        ├── auth.setup.ts         # Login as every role; saves storageState files
        ├── crawl-operator.spec.ts
        ├── crawl-customer.spec.ts
        └── route-protection.spec.ts
```

---

## Prerequisites

### 1. Install Playwright browsers (once per machine)

```bash
cd apps/web
pnpm exec playwright install --with-deps chromium
```

### 2. Ensure all services are running

The tests require:

- **API** at `http://localhost:3100` — NestJS backend
- **Web** at `http://localhost:3210` — Next.js frontend (auto-started by Playwright via `webServer`)
- **PostgreSQL** at `localhost:5433` — seeded with demo data

#### Option A — Docker Compose (recommended for CI)

```bash
# From the repo root
docker compose up -d
# Wait for services to be healthy, then seed
docker compose exec api pnpm db:seed
```

#### Option B — Local dev servers

```bash
# Terminal 1 — start Docker services (DB + MinIO)
docker compose up postgres minio minio-init -d

# Terminal 2 — start the API (must be running before tests; Playwright does NOT auto-start this)
cd apps/api && pnpm dev

# Seed the database (once)
pnpm --filter @xc/db db:seed

# Then run tests from apps/web — Playwright will auto-start Next.js if not running
cd apps/web && pnpm test:e2e
```

> **Note:** Playwright automatically starts the Next.js dev server (`pnpm dev`) via
> the `webServer` configuration in `playwright.config.ts`. If you already have
> it running in another terminal, Playwright will reuse your existing process.
> The NestJS API must be started manually — it requires env vars from `.env` that
> need to be in the shell environment before `nest start` runs.

---

## Running the Tests

All commands below should be run from inside `apps/web/`.

```bash
# Run the full suite (all roles, all specs)
# Playwright will auto-start the Next.js dev server if not already running.
# Ensure the API is running first: pnpm --filter @xc/api dev
pnpm test:e2e

# Run with the interactive Playwright UI (great for debugging)
pnpm exec playwright test --ui

# Run only route-protection tests
pnpm exec playwright test route-protection

# Run only for a specific project (role)
pnpm exec playwright test --project=super-admin
pnpm exec playwright test --project=customer-viewer

# Run a single spec file
pnpm exec playwright test tests/smoke/crawl-operator.spec.ts

# Open the HTML report after a run
pnpm exec playwright show-report .playwright/report
```

---

## GitHub Actions CI

Add the following job to your workflow file (e.g. `.github/workflows/e2e.yml`):

```yaml
name: E2E Smoke Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: xc
          POSTGRES_PASSWORD: xc_dev
          POSTGRES_DB: crossconnect
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      minio:
        image: bitnami/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        ports:
          - 9000:9000

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @xc/db db:generate

      - name: Run database migrations
        run: pnpm --filter @xc/db db:migrate
        env:
          DATABASE_URL: postgresql://xc:xc_dev@localhost:5433/crossconnect

      - name: Seed database
        run: pnpm --filter @xc/db db:seed
        env:
          DATABASE_URL: postgresql://xc:xc_dev@localhost:5433/crossconnect

      - name: Build packages
        run: pnpm build --filter=@xc/types --filter=@xc/db

      - name: Start API server
        run: pnpm --filter @xc/api dev &
        env:
          DATABASE_URL: postgresql://xc:xc_dev@localhost:5433/crossconnect
          JWT_SECRET: ci-test-secret-minimum-32-chars-long
          PORT: 3100
          NODE_ENV: test

      - name: Wait for API to be ready
        # Only wait for the API — Playwright's webServer config handles waiting
        # for the Next.js dev server and will start it automatically if needed.
        run: npx wait-on http://localhost:3100 --timeout 60000

      - name: Install Playwright browsers
        run: pnpm --filter @xc/web exec playwright install --with-deps chromium

      - name: Run Playwright tests
        # Playwright starts the Next.js dev server automatically via webServer config.
        # NEXT_PUBLIC_API_URL must be set so the webServer process inherits it.
        run: pnpm --filter @xc/web test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3210
          NEXT_PUBLIC_API_URL: http://localhost:3100
          NEXTAUTH_SECRET: ci-test-nextauth-secret
          NEXTAUTH_URL: http://localhost:3210
          CI: true

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/.playwright/report/
          retention-days: 14

      - name: Upload failure screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots
          path: apps/web/.playwright/results/
          retention-days: 7
```

---

## Environment Variables

| Variable              | Default                 | Description                                                           |
| --------------------- | ----------------------- | --------------------------------------------------------------------- |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3210` | Web app base URL                                                      |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3100` | API base URL (used by `seeds.ts`)                                     |
| `CI`                  | unset                   | Set to `true` in CI to enable retries and suppress interactive output |

---

## Git Ignore

Add the following to `apps/web/.gitignore` (or the root `.gitignore`):

```gitignore
# Playwright
.playwright/sessions/
.playwright/results/
.playwright/report/
playwright-report/
test-results/
```

Auth session files contain active JWT cookies and **must never be committed**.

---

## Additional Workflow Tests Needed

The smoke suite catches regressions in page loading and RBAC routing, but
the following scenarios require dedicated workflow tests beyond what a BFS
crawler can verify:

### P0 — Critical business flows

| Test                           | Description                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `order-lifecycle.spec.ts`      | Place an order (customer_orderer) → approve (ops_manager) → install work-order completion (ops_tech) → service becomes active |
| `order-rejection.spec.ts`      | Reject order → customer sees `rejected` state                                                                                 |
| `approval-deferred.spec.ts`    | `deferred` decision keeps approval open; `decide` again closes it                                                             |
| `disconnect-lifecycle.spec.ts` | Disconnect order → work order created → completion → service deactivated                                                      |

### P1 — Security regression

| Test                           | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------- |
| `rbac-api.spec.ts`             | Direct API calls with wrong-role JWT return 403 (not data)       |
| `org-isolation.spec.ts`        | Customer of org A cannot read orders/services belonging to org B |
| `privilege-escalation.spec.ts` | `customer_admin` cannot assign `super_admin` role via API        |
| `document-isolation.spec.ts`   | Document download URL returns 403 for users of a different org   |

### P2 — UX correctness

| Test                          | Description                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| `login-invalid-creds.spec.ts` | Invalid credentials show error message; no redirect                    |
| `session-expiry.spec.ts`      | Expired session is redirected to `/login` with `callbackUrl` preserved |
| `new-site-form.spec.ts`       | Create site via form → appears in locations list                       |
| `new-org-with-user.spec.ts`   | Create org → adds user → user can log in                               |
| `inventory-filter.spec.ts`    | Inventory page filters by site correctly                               |
| `audit-log-entries.spec.ts`   | Key actions (approve, complete WO) appear in audit log                 |

---

## Known Limitations

1. **BFS crawl vs. SPA navigation** — The crawler uses `page.goto()` for each
   URL, not in-app navigation. Some React state (filters, pagination) that only
   exists in memory will be reset per page, meaning rarely-visible states are not
   exercised.

2. **Dynamic IDs** — The `seeds.ts` helper only retrieves the _first_ entity of
   each type. Tests against detail pages cover only that single entity. Boundary
   cases (cancelled orders, disconnected services) need explicit fixture setup.

3. **No form submission** — The crawler never fills or submits forms. All
   mutation-path validation must be done in dedicated workflow tests.

4. **Console warnings vs. errors** — Third-party browser extensions and
   development-only React warnings can produce false positives. The
   `assertNoCrawlFailures()` function filters known noisy patterns; update
   this list as new false positives are identified.

5. **Parallel runs** — Workers are set to `1` to avoid shared-DB state
   conflicts. If the database supports per-test transactions with rollback,
   workers can safely be increased.

6. **Auth token expiry during runs** — If the test suite takes longer than the
   JWT access-token lifetime (~15 min), the auth setup session may expire.
   Re-run `auth.setup.ts` or extend the `accessTokenTtl` in the API config for
   testing environments.

7. **MinIO storage** — Document upload/download tests require MinIO to be
   running and the `documents` bucket to exist. The seed script does not
   pre-create the bucket; add a `createBucketIfNotExists` step to CI.
