# CrossConnect — Compliance Audit Findings

**Against: `docs/RULES.md`** | **Date: 2026-03-26**

---

## Executive Summary

The codebase is structurally sound and the domain model is well-designed. However, a consistent pattern of shortcuts has accumulated across the frontend: raw fetch calls bypassing the shared API client, duplicated status-badge maps with divergent colors, missing loading/error states on every page, and patchy use of the shared component library. The backend has a more serious architecture problem: lifecycle files defining the state machine transitions are dead code for 3 out of 4 modules, which means transition rules exist in two places and will inevitably diverge. Several security issues also need immediate attention.

---

## Part 1 — Bugs and Security Issues

> **Status: All items in this section have been resolved (2026-03-26).**

### B1 — Missing `/api/v1/` prefix — 404 at runtime ✅ FIXED

**File:** `apps/web/src/app/(operator)/organizations/[id]/deactivate-buttons.tsx`

Both the `DeactivateOrgButton` and `DeactivateUserButton` in this file call `${API_URL}/organizations/...` — missing the `/api/v1/` prefix. Both requests 404 at runtime. The customer-side equivalent (`deactivate-team-user-button.tsx`) correctly includes `/api/v1/`.

---

### B2 — `customer_viewer` and `ops_technician` can create/submit orders at the API level ✅ FIXED

**File:** `apps/api/src/modules/cross-connects/orders.controller.ts`

`POST /orders`, `PATCH /orders/:id/submit`, and `PATCH /orders/:id/cancel` have no `@Roles()` decorator. Any authenticated user — including `customer_viewer` and `ops_technician` — can create and submit orders. The middleware blocks `customer_viewer` from the new-order page but the API itself is unprotected.

---

### B3 — `portal/page.tsx` shows "Request Cross-Connect" button to `customer_viewer` ✅ FIXED

**File:** `apps/web/src/app/(customer)/portal/page.tsx`

`customer_viewer` users see the "Request Cross-Connect" CTA. Clicking navigates to the page before the client-side redirect guard fires — a confusing broken interaction. The `canPlaceOrders` role check from `layout.tsx` is available but not threaded through to this page.

---

### B4 — `auth.module.ts` uses hardcoded fallback JWT secret ✅ FIXED

**File:** `apps/api/src/modules/auth/auth.module.ts`

```ts
JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev-secret' });
```

The `'dev-secret'` fallback bypasses `AppConfig` and leaks into any environment where `JWT_SECRET` is unset. Should use `JwtModule.registerAsync()` with `AppConfigModule` injection.

---

### B5 — Documents module: no `RolesGuard`, no upload ownership check ✅ FIXED

**File:** `apps/api/src/modules/documents/documents.controller.ts`

`DocumentsController` applies only `JwtAuthGuard`. The upload endpoints (`POST /documents/orders/:orderId/upload`, `POST /documents/work-orders/:woId/upload`) perform no org-ownership check. Any authenticated customer can upload a document to any order they don't own by guessing an ID. The download endpoint does check ownership; upload and list do not.

---

### B6 — Approvals `decide()` never advances the order state ✅ FIXED

**File:** `apps/api/src/modules/approvals/approvals.service.ts`

`ApprovalsService.decide()` records an `ApprovalStep` and marks the `ApprovalRequest` as `decided`, but never calls `OrdersService.approveOrder()` or `OrdersService.rejectOrder()`. After a decision the `CrossConnectOrder.state` remains `pending_approval` — the approval and order workflows are decoupled with no bridge.

---

### B7 — `portal/orders/new/page.tsx` bypasses the shared API client

**File:** `apps/web/src/app/(customer)/portal/orders/new/page.tsx`

This page makes a raw `fetch` to `${API_URL}/api/v1/orders` instead of calling `ordersApi.create()`. The shared `client.ts` handles token injection, 4xx/5xx normalisation, and typed responses — bypassing it means errors on non-2xx responses are silently dropped.

---

## Part 2 — Duplication (Single Source of Truth Violations)

> **Status: Items D7, D8 resolved (2026-03-26). D1–D6 remain open.**

### D1 — `STATE_BADGE` color map defined 4 times, with color divergence

The `OrderState → CSS class` mapping appears in:

- `apps/web/src/app/(customer)/portal/page.tsx`
- `apps/web/src/app/(customer)/portal/orders/page.tsx`
- `apps/web/src/app/(customer)/portal/orders/[id]/page.tsx` — **uses `bg-orange-100` for `under_review`** (all others use `bg-purple-100`)
- `apps/web/src/app/(operator)/orders/page.tsx`

Meanwhile `OrderStateBadge` in `status-badge.tsx` (the canonical component) also exists and uses `orange` for `under_review`. Three of the four inline maps contradict the component they should be using. All four should be replaced with `<OrderStateBadge>`.

---

### D2 — `act()` + `apiPatch()` helper pattern duplicated 3 times

An identical pattern — local `async function apiPatch(path, body)` wrapping raw `fetch` with an `Authorization` header, plus an `act()` wrapper managing `busy`/`error` state and calling `router.refresh()` — appears verbatim in:

- `apps/web/src/app/(operator)/orders/[id]/order-actions.tsx`
- `apps/web/src/app/(operator)/services/[id]/service-actions.tsx`
- `apps/web/src/app/(operator)/work-orders/[id]/work-order-actions.tsx`

The `btnBase` Tailwind class string is also duplicated between the first two. This pattern should be a single shared hook or utility.

---

### D3 — `ROLE_LABEL` map defined twice in customer team pages

`apps/web/src/app/(customer)/portal/team/page.tsx` and `portal/team/[userId]/page.tsx` each independently define an identical `ROLE_LABEL: Record<string, string>` map covering all 6 roles.

---

### D4 — `InfoCard` / `Card` local components duplicated across service detail pages

`apps/web/src/app/(operator)/services/[id]/page.tsx` defines a local `InfoCard` component. `apps/web/src/app/(customer)/portal/services/[id]/page.tsx` defines a structurally identical `Card` component. Both render `rounded-lg border border-gray-200 bg-white px-4 py-3` — the same thing as the existing `<DetailSection>` component in `components/ui/`.

---

### D5 — Room-type badge logic duplicated in 2 location pages

The inline ternary coloring for `mmr`/`telco_closet`/default room types is copy-pasted in:

- `apps/web/src/app/(operator)/locations/[siteId]/page.tsx` (inside `BuildingCard`)
- `apps/web/src/app/(operator)/locations/[siteId]/buildings/[buildingId]/page.tsx`

Neither uses `<Badge>` from `status-badge.tsx` which already supports variants.

---

### D6 — `PaginatedResponse<T>` re-declared locally in the web API client

`packages/types` exports `PaginatedResponse<T>`. `apps/web/src/lib/api/cross-connects.ts` re-declares it locally instead of importing from `@xc/types`. More critically, `organizations.ts` declares a structurally different `PaginatedOrganizations` with flat fields instead of a nested `meta` object — inconsistent with what the API actually returns.

---

### D7 — Pagination boilerplate duplicated across 6 backend services ✅ FIXED

`buildPaginatedMeta()` helper extracted to `apps/api/src/common/pagination/paginate.ts` and used in all 5 list services (orders, services, work-orders, organizations, audit).

---

### D8 — `OrganizationDto`, `UserDto`, `BuildingDto` defined locally in `apps/web` instead of `packages/types` ✅ FIXED

`OrganizationDto`, `UserDto` moved to `packages/types/src/domain/organizations.ts`. `BuildingDto` moved to `packages/types/src/domain/locations.ts`. Both `apps/web/src/lib/api/organizations.ts` and `locations.ts` now import from and re-export `@xc/types`.

---

## Part 3 — Architecture Problems

> **Status: Items A1–A7, A9 resolved (2026-03-26). A8 resolved previously. A10 open.**

### A1 — Three lifecycle files are dead code for their own modules ✅ FIXED

`orders.service.ts`, `inventory.service.ts`, and `topology.service.ts` now use `StateMachine` + their respective `*.lifecycle.ts` files. All inline state checks and `ALLOWED_TRANSITIONS` maps removed. Each service follows the same `toHttpException()` pattern as `services.service.ts`.

---

### A2 — No `servicesApi` module in the web API library ✅ FIXED

`apps/web/src/lib/api/services.ts` created with fully typed `servicesApi` (list, getOne, disconnect, abortProvisioning, suspend, resume, extend). All 4 service pages updated to use it.

---

### A3 — `DatacenterDto` is a legacy-named, incomplete type for `Site` ✅ FIXED

`SiteDto` added to `packages/types/src/domain/locations.ts` with `state`, `timezone`, `isActive`, `notes` fields. `DatacenterDto` kept as `@deprecated` type alias. `BuildingDto` added to `packages/types`.

---

### A4 — `ServiceEndpointDto` has a field mismatch ✅ FIXED

`ServiceEndpointDto.desiredPanelId` renamed to `assignedPanelId` in `packages/types/src/domain/cross-connects.ts`.

---

### A5 — `ConnectorType` and `StrandRole` enums exist in the DB but not in `packages/types` ✅ FIXED

`ConnectorType` and `StrandRole` const-object enums added to `packages/types/src/enums.ts`. `api/schemas.ts` updated to derive `z.enum()` tuples from them. `PortDto.connectorType` and `.strandRole` now use the enum types.

---

### A6 — `role` is typed as `string` at every security boundary ✅ FIXED

`AuthenticatedUser.role`, `JwtPayload.role`, and `LoginResponse.user.role` now typed as `UserRole`. `OrganizationDto`/`UserDto` in `packages/types` also use `UserRole`.

---

### A7 — `Math.random()` used for order and WO number generation ✅ FIXED

`generateOrderNumber()` in `orders.service.ts` and `generateWoNumber()` in `work-orders.service.ts` now use `randomInt(10000, 100000)` from Node.js `node:crypto` — cryptographically random, collision-resistant under concurrent load.

---

### A8 — `app.module.ts` duplicates throttle config from env instead of using `AppConfig` ✅ FIXED

`ThrottlerModule` in `app.module.ts` reads `process.env.THROTTLE_*` directly with `parseInt`, duplicating logic already in `AppConfig.throttleTtl/throttleLimit`. If the env var is unset, `parseInt(undefined)` returns `NaN`, silently disabling the rate limiter.

---

### A9 — `(operator)/layout.tsx` missing `force-dynamic` ✅ FIXED

`export const dynamic = 'force-dynamic'` added to `apps/web/src/app/(operator)/layout.tsx`.

---

### A10 — `JobsService` is wired but unused

`JobsModule` is global and registered in `AppModule`, and `pg-boss` initialises on startup, but no domain module injects or calls `JobsService`. This adds startup overhead and open DB connections for no current benefit. Either defer registration or document it as intentional scaffolding for Phase 2.

---

## Part 4 — Design and UI Consistency Violations

### U1 — No `loading.tsx` or `error.tsx` files exist anywhere

Every page in the app does a synchronous `await` before rendering. There are no Next.js route-segment `loading.tsx` files (no skeleton states) and no `error.tsx` files (no error boundary UI). Any slow or failed API call blocks rendering or produces a bare empty page.

---

### U2 — Inconsistent empty state treatment

`<EmptyState>` exists in `components/ui/` and is used in ~8 pages but skipped in ~8 others, which use:

- Inline `<td colSpan={N}>No X found.</td>` — in `portal/orders`, `operator/orders`, `dashboard`
- Custom dashed `<div>` — in `billing/page.tsx`, buildings detail, some location pages
- Plain `<p>` text — in `portal/team/page.tsx`

---

### U3 — `<PageHeader>` not used consistently

Most operator pages use `<PageHeader>`. Several pages still use inline `<h1>` elements with manually assembled flex containers:

- `apps/web/src/app/(operator)/billing/page.tsx`
- `apps/web/src/app/(operator)/dashboard/page.tsx`
- All customer portal list pages: `portal/page.tsx`, `portal/orders/page.tsx`, `portal/services/page.tsx`, `portal/team/page.tsx`

---

### U4 — Breadcrumb rendered two different ways

`<PageHeader breadcrumb={...}>` is used in most operator pages. Four pages instead render manual `<div className="flex items-center gap-2 text-sm text-gray-500">` breadcrumbs with `<Link>`:

- `apps/web/src/app/(operator)/organizations/[id]/edit/page.tsx`
- `apps/web/src/app/(operator)/organizations/[id]/users/new/page.tsx`
- `apps/web/src/app/(customer)/portal/team/[userId]/page.tsx`
- `apps/web/src/app/(customer)/portal/orders/[id]/page.tsx`

---

### U5 — `confirm()` / `alert()` used for destructive actions

Four files use browser `confirm()` and `alert()` for deactivation confirmation. These are inaccessible (not keyboard-navigable, not focusable by assistive tech, OS-themed, not brand-consistent):

- `apps/web/src/app/(operator)/organizations/[id]/deactivate-buttons.tsx`
- `apps/web/src/app/(customer)/portal/team/deactivate-team-user-button.tsx`
- `apps/web/src/app/(operator)/orders/[id]/order-actions.tsx`
- `apps/web/src/app/(operator)/services/[id]/service-actions.tsx`

---

### U6 — Table header and cell styling inconsistent

- Customer portal + inventory tables: `font-medium text-gray-500` (no uppercase/tracking)
- Operator list page tables: `font-medium uppercase tracking-wide text-gray-500`
- Cell padding: `px-6 py-4` (most operator), `px-4 py-3` (dashboard + customer), `px-4 py-2` (inventory sub-table)

---

### U7 — Mixed API fetch patterns in page files

11+ pages bypass the shared `lib/api/` modules and call `apiClient.get<any>()` or raw `fetch()` directly. This scatters token management, URL construction, and error normalisation logic across page files:

| Page                                   | Pattern used                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `portal/orders/new/page.tsx`           | Raw `fetch` to `${API_URL}/api/v1/orders`                                           |
| `portal/services/page.tsx`             | `apiClient.get('/services?...')` directly                                           |
| `portal/services/[id]/page.tsx`        | `apiClient.get<any>('/services/${id}')`                                             |
| `(operator)/dashboard/page.tsx`        | `apiClient.get<ServicePage>('/services?...')` + `apiClient.get('/work-orders?...')` |
| `(operator)/services/page.tsx`         | `apiClient.get('/services?...')` directly                                           |
| `(operator)/services/[id]/page.tsx`    | `apiClient.get<any>('/services/${id}')`                                             |
| `(operator)/work-orders/page.tsx`      | `apiClient.get('/work-orders?...')` directly                                        |
| `(operator)/work-orders/[id]/page.tsx` | `apiClient.get<any>('/work-orders/${id}')`                                          |
| `(operator)/audit/page.tsx`            | `apiClient.get('/audit?...')` directly                                              |
| `(operator)/billing/page.tsx`          | `apiClient.get('/billing-events/pending')` directly                                 |
| `(operator)/orders/[id]/page.tsx`      | `apiClient.get('/audit/orders/${id}')` directly                                     |

---

### U8 — `<PageHeader>` breadcrumb uses `<a>` instead of `<Link>`

`apps/web/src/components/ui/page-header.tsx` renders breadcrumb crumbs as `<a href>`. Every breadcrumb click causes a full-page reload instead of a client-side transition.

---

## Part 5 — Accessibility Gaps

| ID     | Issue                                                                                                              | Files affected                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| A11y-1 | Icon buttons use `title` only, not `aria-label` (screen readers on some platforms ignore `title`)                  | `collapsible-sidebar.tsx` — hamburger, close, and collapse/expand buttons  |
| A11y-2 | Mobile overlay backdrop `<div>` has no `role`, `tabIndex`, or `onKeyDown` — keyboard users cannot close the drawer | `collapsible-sidebar.tsx`                                                  |
| A11y-3 | Color-only status indicators — all `*StateBadge` components convey state by color alone with no secondary signal   | `status-badge.tsx` and all inline badge maps                               |
| A11y-4 | `<th>` elements missing `scope="col"` across virtually every table                                                 | All list page tables                                                       |
| A11y-5 | Filter `<select>` elements have no associated `<label>` (placeholder approach doesn't work on `<select>`)          | `portal/orders`, `portal/services`, `operator/orders`, `operator/services` |
| A11y-6 | Label/input pairs in `portal/orders/new` `<EndpointSection>` have no `htmlFor`/`id` association                    | `apps/web/src/app/(customer)/portal/orders/new/page.tsx`                   |

---

## Prioritized Remediation Plan

### Priority 1 — Security & Correctness

| #   | Item | Task                                                                                                                            |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | B1   | Fix missing `/api/v1/` prefix in operator `deactivate-buttons.tsx` ✅                                                           |
| 1.2 | B2   | Add `@Roles('customer_admin', 'customer_orderer')` to `POST /orders`, `PATCH /orders/:id/submit`, `PATCH /orders/:id/cancel` ✅ |
| 1.3 | B3   | Gate "Request Cross-Connect" button on `canPlaceOrders` in `portal/page.tsx` ✅                                                 |
| 1.4 | B4   | Switch `JwtModule.register` to `JwtModule.registerAsync` using `AppConfigModule` ✅                                             |
| 1.5 | B5   | Add `RolesGuard` + org ownership checks to document upload and list endpoints ✅                                                |
| 1.6 | B6   | Wire `ApprovalsService.decide()` to advance the `CrossConnectOrder` state ✅                                                    |
| 1.7 | A8   | Fix `ThrottlerModule` to use `AppConfig` via `registerAsync` instead of raw `process.env` ✅                                    |

### Priority 2 — Architecture

| #    | Item  | Task                                                                                                                            |
| ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | A1    | Make `orders.service.ts` use `StateMachine` + `order.lifecycle.ts` for all transitions ✅                                       |
| 2.2  | A1    | Make `inventory.service.ts` use `StateMachine` + `port.lifecycle.ts` ✅                                                         |
| 2.3  | A1    | Make `topology.service.ts` use `StateMachine` + `path.lifecycle.ts` ✅                                                          |
| 2.4  | A2    | Create `apps/web/src/lib/api/services.ts` — typed `servicesApi` module; update all pages ✅                                     |
| 2.5  | A7    | Replace `Math.random()` number generation with `crypto.randomInt` ✅                                                            |
| 2.6  | A5    | Add `ConnectorType` and `StrandRole` to `packages/types/src/enums.ts`; use in all Zod schemas ✅                                |
| 2.7  | A3/D8 | Rename `DatacenterDto → SiteDto`, add missing fields; move `BuildingDto`, `OrganizationDto`, `UserDto` into `packages/types` ✅ |
| 2.8  | A4    | Fix `ServiceEndpointDto.desiredPanelId → assignedPanelId` ✅                                                                    |
| 2.9  | A6    | Type `AuthenticatedUser.role`, `JwtPayload.role`, `LoginResponse.user.role` as `UserRole` ✅                                    |
| 2.10 | D7    | Extract shared `buildPaginatedMeta()` helper; use across all 5 services ✅                                                      |
| 2.11 | A9    | Add `force-dynamic` to `(operator)/layout.tsx` ✅                                                                               |

### Priority 3 — Duplication Elimination

| #   | Item | Task                                                                                                             |
| --- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| 3.1 | D1   | Replace all 4 inline `STATE_BADGE` maps with `<OrderStateBadge>`                                                 |
| 3.2 | D2   | Extract `act()` + `apiPatch()` into a shared hook `useApiAction()`; use in all 3 action components               |
| 3.3 | D3   | Extract `ROLE_LABEL` to a shared constant; import in both team pages                                             |
| 3.4 | D4   | Replace local `InfoCard`/`Card` components in service detail pages with `<DetailSection>`                        |
| 3.5 | D5   | Replace inline room-type badge ternaries with `<Badge>` variant                                                  |
| 3.6 | D6   | Import `PaginatedResponse<T>` from `@xc/types` everywhere; remove local re-declarations                          |
| 3.7 | —    | Move inline DTOs (`SetPortStateDto`, `AbortProvisioningDto`, `MarkExportedDto`) to their respective `dto/` files |

### Priority 4 — UI Consistency

| #   | Item | Task                                                                                                                 |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------- |
| 4.1 | U3   | Add `<PageHeader>` to `billing/page.tsx`, `dashboard/page.tsx`, and all customer portal list pages                   |
| 4.2 | U4   | Replace manual breadcrumb `<div>` in 4 pages with `<PageHeader breadcrumb={...}>`                                    |
| 4.3 | U5   | Replace `confirm()`/`alert()` in all 4 files with an in-page confirmation UI                                         |
| 4.4 | U2   | Standardize empty state: replace all inline table rows, custom dashed boxes, and `<p>` fallbacks with `<EmptyState>` |
| 4.5 | U6   | Standardize table `<th>` styling to one class set across all pages                                                   |
| 4.6 | U8   | Change `<PageHeader>` breadcrumb links from `<a>` to `<Link>`                                                        |

### Priority 5 — Loading / Error States

| #   | Item | Task                                                                                                    |
| --- | ---- | ------------------------------------------------------------------------------------------------------- |
| 5.1 | U1   | Add `loading.tsx` skeleton files for key list pages (orders, services, work-orders, organizations)      |
| 5.2 | U1   | Add `error.tsx` files for each route group to catch unexpected failures gracefully                      |
| 5.3 | U7   | Migrate all remaining raw `fetch` / `apiClient.get` calls in page files to use typed `lib/api/` modules |

### Priority 6 — Accessibility

| #   | Item   | Task                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------ |
| 6.1 | A11y-1 | Add `aria-label` to all icon-only buttons in `collapsible-sidebar.tsx`                     |
| 6.2 | A11y-2 | Add `role="button"`, `tabIndex={0}`, and `onKeyDown` to the mobile backdrop `<div>`        |
| 6.3 | A11y-4 | Add `scope="col"` to all `<th>` elements across all tables                                 |
| 6.4 | A11y-5 | Add visible `<label>` elements (or `aria-label`) to all filter `<select>` inputs           |
| 6.5 | A11y-6 | Add `htmlFor`/`id` pairs to all label+input pairs in `portal/orders/new` endpoint sections |

---

## Quick-Reference Priority Matrix

| Priority                | Items     | Rationale                                                         |
| ----------------------- | --------- | ----------------------------------------------------------------- |
| **P1 — Security**       | B1–B7, A8 | Runtime bugs and exploitable auth gaps — fix before anything else |
| **P2 — Architecture**   | A1–A10    | Prevents rule divergence; unblocks safe future changes            |
| **P3 — Duplication**    | D1–D8     | Eliminates multiple sources of truth; reduces maintenance surface |
| **P4 — UI Consistency** | U1–U8     | Coherent product feel across all pages                            |
| **P5 — Loading/Error**  | U1, U7    | Production readiness — no bare/empty page on failures             |
| **P6 — Accessibility**  | A11y-1–6  | Compliance and inclusivity                                        |
