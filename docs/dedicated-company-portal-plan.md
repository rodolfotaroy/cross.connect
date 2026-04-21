# Dedicated Company Portal — Implementation Plan

> **Status:** Draft  
> **Depends on:** Phase 1 fully deployed  
> **Route prefix:** `/sp` (Service Partner portal)  
> **API prefix:** `/api/v1/sp`

---

## Overview

A self-contained portal for dedicated partner companies who want their own branded cross-connect management system — separate from the standard customer ordering flow. Each dedicated company gets isolated data, its own role hierarchy, internal team management, a simplified cross-connect CRUD, reporting, and a support/ticketing system.

---

## Stage 1 — Schema & Roles Foundation

**Goal:** Extend the database and type system to support dedicated companies, their roles, and the new cross-connect model.

### 1.1 New Roles

Add four new roles to the `UserRole` enum:

| Role        | Permissions                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| `sp_admin`  | Full CRUD on cross connects. Manage team (invite, edit roles, deactivate users). Access reports & support. |
| `sp_ops`    | Create cross connects. Edit/delete only if status = `Draft` AND user is the original submitter.            |
| `sp_viewer` | Read-only access to cross connects.                                                                        |
| `sp_report` | Read-only access to cross connects. Run reports and export data (CSV/Excel).                               |

**Files to modify:**

- `packages/types/src/enums.ts` — Add roles to `UserRole` enum
- `packages/db/prisma/schema.prisma` — Add roles to the Prisma `UserRole` enum

### 1.2 New Database Models

#### `DedicatedCrossConnect`

A simplified, flat cross-connect record (not using the existing order→service two-layer model). This is intentional — dedicated companies want a streamlined, spreadsheet-like experience.

```
model DedicatedCrossConnect {
  id                       String    @id @default(cuid())
  crossConnectId           String    @unique          // Human-readable ID (auto-generated, e.g. "XC-0001")
  circuitId                String?
  ticketNumber             String?
  salesSource              String?
  nrc                      Decimal?  @db.Decimal(12,2) // Non-Recurring Charge
  mrc                      Decimal?  @db.Decimal(12,2) // Monthly Recurring Charge
  serviceId                String?
  status                   DedicatedXcStatus @default(draft)
  testReport               String?                     // URL or document reference
  siteId                   String?
  site                     Site?     @relation(fields: [siteId], references: [id])
  dateCompleted            DateTime?
  year                     Int?
  quarter                  Int?                         // 1-4
  billableDate             DateTime?
  disconnectionDate        DateTime?
  requestedDisconnectionDate DateTime?
  orderingCompany          String?

  // A-End location
  aEndCampus               String?
  aEndBuilding             String?
  aEndFloor                String?
  aEndRoom                 String?
  aEndRack                 String?
  aEndDevice               String?
  aEndPort                 String?

  // Z-End location
  zEndCampus               String?
  zEndBuilding             String?
  zEndFloor                String?
  zEndRoom                 String?
  zEndRack                 String?
  zEndDevice               String?
  zEndPort                 String?

  customerType             String?
  cableType                String?

  // Hops (stored as related model)
  hops                     DedicatedXcHop[]

  // Ownership
  organizationId           String
  organization             Organization @relation(fields: [organizationId], references: [id])
  createdById              String
  createdBy                User       @relation("dedicatedXcCreator", fields: [createdById], references: [id])

  createdAt                DateTime   @default(now())
  updatedAt                DateTime   @updatedAt
}

enum DedicatedXcStatus {
  draft
  submitted
  in_progress
  completed
  disconnected
}

model DedicatedXcHop {
  id                       String   @id @default(cuid())
  dedicatedCrossConnectId  String
  dedicatedCrossConnect    DedicatedCrossConnect @relation(fields: [dedicatedCrossConnectId], references: [id], onDelete: Cascade)
  hopNumber                Int                   // Ordering: 1, 2, 3...
  room                     String?
  rack                     String?
  device                   String?
  port                     String?

  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([dedicatedCrossConnectId, hopNumber])
}
```

#### `SupportTicket`

```
model SupportTicket {
  id              String              @id @default(cuid())
  subject         String
  description     String
  category        TicketCategory      @default(issue)
  priority        TicketPriority      @default(medium)
  status          TicketStatus        @default(open)

  organizationId  String
  organization    Organization        @relation(fields: [organizationId], references: [id])
  createdById     String
  createdBy       User                @relation("ticketCreator", fields: [createdById], references: [id])

  // Resolution
  resolvedAt      DateTime?
  resolvedById    String?
  resolvedBy      User?               @relation("ticketResolver", fields: [resolvedById], references: [id])
  resolutionNote  String?

  comments        TicketComment[]

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

enum TicketCategory {
  issue
  suggestion
  billing
  access
  other
}

enum TicketPriority {
  low
  medium
  high
  critical
}

enum TicketStatus {
  open
  in_progress
  resolved
  closed
}

model TicketComment {
  id              String        @id @default(cuid())
  ticketId        String
  ticket          SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  body            String
  authorId        String
  author          User          @relation(fields: [authorId], references: [id])
  createdAt       DateTime      @default(now())
}
```

#### Organization Flag

Add a field to the existing `Organization` model:

```
isDedicated      Boolean  @default(false)   // Marks this org as a dedicated portal company
```

### 1.3 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                                                                                                                     | Input                   |
| --- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1a  | Code      | Add `sp_admin`, `sp_ops`, `sp_viewer`, `sp_report` to `UserRole` in `packages/types/src/enums.ts` and Prisma schema                                                                                      | Exact enum values above |
| 1b  | Code      | Add `DedicatedXcStatus`, `TicketCategory`, `TicketPriority`, `TicketStatus` enums to `packages/types/src/enums.ts` and Prisma schema                                                                     | Enum definitions above  |
| 1c  | Code      | Add `DedicatedCrossConnect`, `DedicatedXcHop`, `SupportTicket`, `TicketComment` models to Prisma schema. Add `isDedicated` to `Organization`. Add necessary relations to `User`, `Organization`, `Site`. | Schema above            |
| 1d  | Terminal  | Run `pnpm prisma migrate dev --name add-dedicated-portal` from `packages/db`                                                                                                                             | —                       |

---

## Stage 2 — API Module: Dedicated Cross Connects

**Goal:** Build the backend CRUD for dedicated cross connects with role-based access control.

### 2.1 Module Structure

```
apps/api/src/modules/dedicated/
├── dedicated.module.ts
├── cross-connects/
│   ├── dedicated-xc.controller.ts
│   ├── dedicated-xc.service.ts
│   └── dto/
│       ├── create-dedicated-xc.dto.ts
│       ├── update-dedicated-xc.dto.ts
│       └── query-dedicated-xc.dto.ts
├── reports/
│   ├── reports.controller.ts
│   └── reports.service.ts
├── support/
│   ├── support.controller.ts
│   ├── support.service.ts
│   └── dto/
│       ├── create-ticket.dto.ts
│       └── create-comment.dto.ts
└── team/
    ├── team.controller.ts
    └── team.service.ts
```

### 2.2 Dedicated Cross Connect Endpoints

| Method   | Path                                 | Roles                  | Description                                                               |
| -------- | ------------------------------------ | ---------------------- | ------------------------------------------------------------------------- |
| `GET`    | `/sp/cross-connects`                 | All SP roles           | List cross connects for user's org. Pagination, search, filter by status. |
| `GET`    | `/sp/cross-connects/:id`             | All SP roles           | Get single record with hops.                                              |
| `POST`   | `/sp/cross-connects`                 | `sp_admin`, `sp_ops`   | Create new entry (defaults to `draft`). Accept hops array.                |
| `PATCH`  | `/sp/cross-connects/:id`             | `sp_admin`, `sp_ops`\* | Update entry. \*`sp_ops` only if status=draft AND is submitter.           |
| `DELETE` | `/sp/cross-connects/:id`             | `sp_admin`, `sp_ops`\* | Soft or hard delete. \*`sp_ops` only if status=draft AND is submitter.    |
| `POST`   | `/sp/cross-connects/:id/hops`        | `sp_admin`, `sp_ops`\* | Add a hop to a cross connect.                                             |
| `DELETE` | `/sp/cross-connects/:id/hops/:hopId` | `sp_admin`, `sp_ops`\* | Remove a hop.                                                             |

**Business rules:**

- All data is scoped to the user's `organizationId` (enforced at service level, never trust client).
- Auto-generate `crossConnectId` as sequential `XC-NNNN` per organization.
- `year` and `quarter` auto-filled from `dateCompleted` if not manually set.
- Status transitions: `draft` → `submitted` → `in_progress` → `completed` → `disconnected`.

### 2.3 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                                               |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2a  | Code      | Create Zod DTOs in `packages/types/src/api/` for dedicated XC create/update/query schemas                                          |
| 2b  | Code      | Create `dedicated-xc.service.ts` — CRUD with org-scoped queries, auto-ID generation, hop management, ownership checks for `sp_ops` |
| 2c  | Code      | Create `dedicated-xc.controller.ts` — REST endpoints with `@Roles()` guards, Zod validation pipe                                   |
| 2d  | Code      | Create `dedicated.module.ts` and register in `app.module.ts`                                                                       |

---

## Stage 3 — API Module: Reports

**Goal:** Reporting endpoints that allow `sp_report` and `sp_admin` to query and export billing data.

### 3.1 Endpoints

| Method | Path                                | Roles                   | Description                                                                                    |
| ------ | ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `GET`  | `/sp/reports/summary`               | `sp_admin`, `sp_report` | Aggregate totals: total NRC, total MRC, count by status, count by quarter.                     |
| `GET`  | `/sp/reports/cross-connects`        | `sp_admin`, `sp_report` | Filterable list optimized for export (date ranges, status, quarter, year). Returns all fields. |
| `GET`  | `/sp/reports/cross-connects/export` | `sp_admin`, `sp_report` | CSV export of filtered data. Response `Content-Type: text/csv`.                                |

### 3.2 Filters for Report Queries

- `year` (int)
- `quarter` (1-4)
- `status` (DedicatedXcStatus)
- `dateFrom` / `dateTo` (ISO date strings; applied to `billableDate`)
- `orderingCompany` (string, partial match)
- `customerType` (string)

### 3.3 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                    |
| --- | --------- | ------------------------------------------------------------------------------------------------------- |
| 3a  | Code      | Create `reports.service.ts` — summary aggregation (Prisma groupBy), filtered list query, CSV generation |
| 3b  | Code      | Create `reports.controller.ts` — endpoints with `@Roles('sp_admin', 'sp_report')`                       |

---

## Stage 4 — API Module: Team Management

**Goal:** Allow `sp_admin` to manage users within their dedicated organization.

### 4.1 Endpoints

| Method   | Path               | Roles      | Description                                                                                   |
| -------- | ------------------ | ---------- | --------------------------------------------------------------------------------------------- |
| `GET`    | `/sp/team`         | `sp_admin` | List all users in the org                                                                     |
| `POST`   | `/sp/team`         | `sp_admin` | Invite/create a new user (assign one of `sp_admin`, `sp_ops`, `sp_viewer`, `sp_report` roles) |
| `PATCH`  | `/sp/team/:userId` | `sp_admin` | Update user role or details                                                                   |
| `DELETE` | `/sp/team/:userId` | `sp_admin` | Deactivate user (soft delete or flag)                                                         |

**Business rules:**

- `sp_admin` cannot change their own role or deactivate themselves.
- New users can only be assigned `sp_*` roles (never `super_admin`, `ops_*`, `customer_*`).
- All users are scoped to the admin's `organizationId`.

### 4.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                                |
| --- | --------- | ------------------------------------------------------------------- |
| 4a  | Code      | Create `team.service.ts` — user CRUD scoped to org, role validation |
| 4b  | Code      | Create `team.controller.ts` — endpoints with `@Roles('sp_admin')`   |

---

## Stage 5 — API Module: Support & Ticketing

**Goal:** Simple ticketing system for dedicated company users to report issues, request help, or suggest improvements.

### 5.1 Endpoints

| Method  | Path                               | Roles        | Description                                              |
| ------- | ---------------------------------- | ------------ | -------------------------------------------------------- |
| `GET`   | `/sp/support/tickets`              | All SP roles | List tickets for user's org. Filter by status, category. |
| `GET`   | `/sp/support/tickets/:id`          | All SP roles | Ticket detail with comments.                             |
| `POST`  | `/sp/support/tickets`              | All SP roles | Create a new ticket.                                     |
| `PATCH` | `/sp/support/tickets/:id`          | `sp_admin`   | Update ticket status (resolve, close).                   |
| `POST`  | `/sp/support/tickets/:id/comments` | All SP roles | Add a comment to a ticket.                               |
| `GET`   | `/sp/support/contact`              | All SP roles | Return app owner contact details (from config/env).      |

### 5.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                                  |
| --- | --------- | --------------------------------------------------------------------- |
| 5a  | Code      | Create Zod DTOs for ticket create/update and comment create           |
| 5b  | Code      | Create `support.service.ts` — ticket CRUD, comment append, org-scoped |
| 5c  | Code      | Create `support.controller.ts` — REST endpoints                       |

---

## Stage 6 — Middleware & Auth Updates

**Goal:** Wire up the new SP roles in auth, middleware, and route protection.

### 6.1 Changes

| File                                        | Change                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/auth/auth.service.ts` | No changes needed — JWT payload already includes `role` and `orgId`                                           |
| `apps/web/src/middleware.ts`                | Add `/sp` route group: block non-`sp_*` roles from `/sp/**`. Block `sp_*` roles from `/dashboard`, `/portal`. |
| `packages/types/src/enums.ts`               | Already done in Stage 1                                                                                       |
| `apps/web/src/lib/constants/role-labels.ts` | Add labels for `sp_admin`, `sp_ops`, `sp_viewer`, `sp_report`                                                 |

### 6.2 Route Protection Rules

```
/sp/**                → sp_admin, sp_ops, sp_viewer, sp_report only
/sp/team/**           → sp_admin only
/sp/reports/**        → sp_admin, sp_report only
/sp/cross-connects/new → sp_admin, sp_ops only
```

### 6.3 Sub-agent Tasks

| #   | Sub-agent | Task                                                  |
| --- | --------- | ----------------------------------------------------- |
| 6a  | Code      | Update `middleware.ts` with SP route protection rules |
| 6b  | Code      | Add role labels in `role-labels.ts`                   |

---

## Stage 7 — Web: SP Layout & Dashboard

**Goal:** Create the dedicated portal shell (sidebar, layout) and dashboard page.

### 7.1 Route Structure

```
apps/web/src/app/(sp)/
├── layout.tsx              ← Sidebar + auth guard for sp_* roles
├── error.tsx
└── sp/
    ├── page.tsx            ← Dashboard
    ├── cross-connects/
    │   ├── page.tsx        ← List
    │   ├── new/
    │   │   └── page.tsx    ← Create form
    │   └── [id]/
    │       ├── page.tsx    ← Detail / Edit
    │       └── edit/
    │           └── page.tsx
    ├── reports/
    │   └── page.tsx        ← Reports + export
    ├── team/
    │   ├── page.tsx        ← Team list
    │   ├── new/
    │   │   └── page.tsx    ← Invite user
    │   └── [userId]/
    │       └── page.tsx    ← Edit user
    └── support/
        ├── page.tsx        ← Ticket list + contact info
        ├── new/
        │   └── page.tsx    ← Create ticket
        └── [id]/
            └── page.tsx    ← Ticket detail + comments
```

### 7.2 Layout

- Reuse `CollapsibleSidebar` with SP-specific nav items
- Title: Organization name (from session)
- Nav items (role-conditional):
  - Dashboard → `/sp` (all)
  - Cross Connects → `/sp/cross-connects` (all)
  - Reports → `/sp/reports` (`sp_admin`, `sp_report`)
  - My Team → `/sp/team` (`sp_admin`)
  - Support → `/sp/support` (all)

### 7.3 Dashboard Content

- Summary cards: Total Cross Connects, Active, In Progress, Draft
- MRC/NRC totals (for `sp_admin` and `sp_report` only)
- Recent cross connects table (last 10)
- Open support tickets count

### 7.4 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                 |
| --- | --------- | ---------------------------------------------------------------------------------------------------- |
| 7a  | Code      | Create `(sp)/layout.tsx` — auth guard, sidebar, role checks (follow `(customer)/layout.tsx` pattern) |
| 7b  | Code      | Create `sp/page.tsx` — dashboard with summary cards + recent table                                   |

---

## Stage 8 — Web: Cross Connects Pages

**Goal:** Build the cross-connect list, create form, and detail/edit pages.

### 8.1 List Page (`/sp/cross-connects`)

- Filter bar: status dropdown, search (by crossConnectId, circuitId, ticketNumber)
- Table columns: Cross Connect ID, Circuit ID, Status (badge), Site, Ordering Company, MRC, Date Completed
- Pagination
- "New Cross Connect" button (visible to `sp_admin`, `sp_ops`)
- Rows link to detail page

### 8.2 Create Page (`/sp/cross-connects/new`)

- Multi-section form:
  - **General:** Circuit ID, Ticket Number, Sales Source, Service ID, Ordering Company, Customer Type, Cable Type
  - **Financial:** NRC, MRC, Billable Date
  - **Location A-End:** Campus, Building, Floor, Room, Rack, Device, Port
  - **Location Z-End:** Campus, Building, Floor, Room, Rack, Device, Port
  - **Hops:** Dynamic list — each hop has Room, Rack, Device, Port. "Add Hop" / "Remove Hop" buttons.
  - **Dates:** Requested Disconnection Date
  - **Site:** Dropdown from available sites
- Save as Draft / Submit buttons
- Form validation via Zod

### 8.3 Detail Page (`/sp/cross-connects/:id`)

- Read-only display of all fields (using `DetailSection` component)
- Hops displayed as numbered list
- Status badge
- Action buttons (conditional):
  - Edit (if user has permission)
  - Delete (if `sp_admin`, or `sp_ops` + draft + submitter)
  - Submit (if draft)
  - Mark In Progress / Mark Completed / Mark Disconnected (`sp_admin` only)

### 8.4 Edit Page (`/sp/cross-connects/:id/edit`)

- Same form as create, pre-populated
- Hop add/remove
- Permission check before rendering

### 8.5 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                                      |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8a  | Code      | Create API client module `apps/web/src/lib/api/dedicated-xc.ts` — list, getOne, create, update, delete, addHop, removeHop |
| 8b  | Code      | Create list page `sp/cross-connects/page.tsx` — table, filters, pagination                                                |
| 8c  | Code      | Create form page `sp/cross-connects/new/page.tsx` — multi-section form with dynamic hops                                  |
| 8d  | Code      | Create detail page `sp/cross-connects/[id]/page.tsx` — read-only with actions                                             |
| 8e  | Code      | Create edit page `sp/cross-connects/[id]/edit/page.tsx` — pre-populated form                                              |
| 8f  | Code      | Create `DedicatedXcStatusBadge` component                                                                                 |

---

## Stage 9 — Web: Reports Page

**Goal:** Finance-oriented reporting page with filters and CSV export.

### 9.1 Page Layout

- Filter panel (top):
  - Year dropdown (auto-populated from data)
  - Quarter dropdown (1-4)
  - Status dropdown
  - Date range: Billable Date from/to
  - Ordering Company (text input)
  - "Apply Filters" / "Clear" buttons
- Summary cards row:
  - Total Records, Total NRC, Total MRC, By-quarter breakdown
- Results table:
  - All cross-connect fields relevant to billing
  - Sortable by columns
- Export button → downloads CSV with current filters applied

### 9.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                  |
| --- | --------- | ------------------------------------------------------------------------------------- |
| 9a  | Code      | Create API client `apps/web/src/lib/api/sp-reports.ts`                                |
| 9b  | Code      | Create reports page `sp/reports/page.tsx` — filters, summary cards, table, CSV export |

---

## Stage 10 — Web: Team Management Page

**Goal:** Allow `sp_admin` to manage their org's users.

### 10.1 Features

- List team members: Name, Email, Role (badge), Status
- Invite new user form: Name, Email, Role (dropdown: `sp_admin`, `sp_ops`, `sp_viewer`, `sp_report`)
- Edit user: Change role
- Deactivate user (with confirmation)
- Current user indicator "(you)" — cannot self-deactivate

### 10.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                                                                 |
| --- | --------- | ---------------------------------------------------------------------------------------------------- |
| 10a | Code      | Create API client `apps/web/src/lib/api/sp-team.ts`                                                  |
| 10b | Code      | Create team list page `sp/team/page.tsx` (follow existing `(customer)/portal/team/page.tsx` pattern) |
| 10c | Code      | Create invite page `sp/team/new/page.tsx`                                                            |
| 10d | Code      | Create edit page `sp/team/[userId]/page.tsx`                                                         |

---

## Stage 11 — Web: Support Page

**Goal:** Contact info display + simple ticket CRUD with comments.

### 11.1 Features

- **Contact card** (top): App owner name, email, phone — sourced from environment config
- **Ticket list** below: Subject, Category (badge), Priority (badge), Status (badge), Created date
- **Create ticket form**: Subject, Description (textarea), Category dropdown, Priority dropdown
- **Ticket detail page**: Full description, status timeline, comment thread, add comment form
- `sp_admin` can update ticket status (resolve/close)

### 11.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                                        |
| --- | --------- | --------------------------------------------------------------------------- |
| 11a | Code      | Create API client `apps/web/src/lib/api/sp-support.ts`                      |
| 11b | Code      | Create support list page `sp/support/page.tsx` — contact card + ticket list |
| 11c | Code      | Create ticket form page `sp/support/new/page.tsx`                           |
| 11d | Code      | Create ticket detail page `sp/support/[id]/page.tsx` — with comment thread  |

---

## Stage 12 — Testing

**Goal:** Unit tests for services, integration tests for controllers, and smoke tests for the web UI.

### 12.1 Test Plan

| Layer      | Test                                                                                | Tool               |
| ---------- | ----------------------------------------------------------------------------------- | ------------------ |
| Service    | `dedicated-xc.service` — CRUD, ownership checks, auto-ID generation, hop management | Vitest             |
| Service    | `reports.service` — aggregation, CSV generation                                     | Vitest             |
| Service    | `support.service` — ticket lifecycle, comment append                                | Vitest             |
| Service    | `team.service` — invite, role change, self-deactivation block                       | Vitest             |
| Controller | All SP endpoints — role enforcement, org scoping, 403/404 scenarios                 | Vitest + supertest |
| E2E        | SP portal crawl — all pages render for correct roles                                | Playwright         |

### 12.2 Sub-agent Tasks

| #   | Sub-agent | Task                                                            |
| --- | --------- | --------------------------------------------------------------- |
| 12a | Code      | Write unit tests for `dedicated-xc.service.ts`                  |
| 12b | Code      | Write unit tests for `reports.service.ts`                       |
| 12c | Code      | Write unit tests for `support.service.ts` and `team.service.ts` |
| 12d | Code      | Write controller integration tests                              |
| 12e | Code      | Add Playwright crawl rules for `/sp/**` routes                  |

---

## Stage 13 — Seed Data

**Goal:** Add seed data for development and testing.

- Create a dedicated organization (`isDedicated: true`)
- Create users for each `sp_*` role
- Seed 20-30 `DedicatedCrossConnect` records with varied statuses, hops, and financial data
- Seed 5-10 `SupportTicket` records with comments

### Sub-agent Tasks

| #   | Sub-agent | Task                                          |
| --- | --------- | --------------------------------------------- |
| 13a | Code      | Add SP seed data to `packages/db/src/seed.ts` |

---

## Implementation Order & Dependencies

```
Stage 1  (Schema & Roles)
  ↓
Stage 2  (API: Cross Connects)  ─┐
Stage 3  (API: Reports)         ─┤── Can be parallelized after Stage 1
Stage 4  (API: Team)            ─┤
Stage 5  (API: Support)         ─┘
  ↓
Stage 6  (Middleware & Auth)  ← Depends on Stages 1-5
  ↓
Stage 7  (Web: Layout & Dashboard)  ← Depends on Stage 6
  ↓
Stage 8  (Web: Cross Connects) ─┐
Stage 9  (Web: Reports)        ─┤── Can be parallelized after Stage 7
Stage 10 (Web: Team)           ─┤
Stage 11 (Web: Support)        ─┘
  ↓
Stage 12 (Testing)  ← After all features
  ↓
Stage 13 (Seed Data)  ← After schema stable
```

---

## Suggestions & Improvements

### 1. Additional Status: `cancelled`

Your status list (`Draft`, `Submitted`, `In Progress`) is missing a terminal state for records that were started but abandoned. Recommend adding:

- **`completed`** — work finished (you may have intended this, listed in status field description but not in the status enum)
- **`disconnected`** — service was disconnected
- **`cancelled`** — order was abandoned before completion

**Included in plan above as:** `draft`, `submitted`, `in_progress`, `completed`, `disconnected`

### 2. Audit Trail

The existing system has a robust `AuditEvent` model. Recommend reusing it for dedicated cross connects — every create/update/delete/status change should produce an audit event. This is nearly free to implement since the `AuditModule` is already imported by `CrossConnectsModule`.

### 3. Auto-Computed Fields

- **Year / Quarter**: Auto-derive from `dateCompleted` when it's set, but allow manual override. Reduces data entry errors.
- **Cross Connect ID**: Auto-generate sequentially per organization (e.g., `ORG-XC-0001`) rather than requiring manual entry. Prevents duplicates and maintains consistency.

### 4. Bulk Import

Finance teams often have existing spreadsheets. Consider adding a CSV import endpoint in a future iteration:

- `POST /sp/cross-connects/import` — accepts CSV, validates, and creates records in bulk.
- This can be deferred to a Phase 2 of the dedicated portal.

### 5. Multi-Hop UX: Drag-and-Drop Reordering

The dynamic hop list should support reordering (drag-and-drop or up/down arrows), not just add/remove. This avoids users having to delete and re-add hops to fix ordering mistakes. **Included in Stage 8 plan.**

### 6. Report Scheduling (Future)

Finance users may want scheduled reports (e.g., monthly CSV emailed). This is out of scope for the initial build but worth noting as a future enhancement. Could be implemented with the existing `JobsModule` (background jobs infrastructure).

### 7. `1st Hop` as Hop #1

Your field list has "1st Hop" as a separate field group. Recommend treating it as `hop[0]` in the hops array (hopNumber = 1) rather than a separate set of fields. This simplifies the data model and the UI — the first hop is just the first entry in the dynamic hops list. **Implemented this way in the plan above.**

### 8. Organization-Level Configuration

Add a `dedicatedConfig` JSON field or related model to `Organization` to store per-company settings:

- Custom branding (logo URL, accent color)
- Contact details for the Support page (instead of global env vars)
- Feature flags (e.g., enable/disable Reports page)
- This allows multiple dedicated companies to be onboarded without code changes.

### 9. Dashboard Metrics for `sp_admin`

The dashboard should show financial summaries (total MRC, total NRC, quarterly trends) since `sp_admin` likely has business oversight responsibilities. **Included in Stage 7 plan.**

### 10. Field-Level Notes

Consider adding a `notes` or `remarks` text field to `DedicatedCrossConnect` for free-form information that doesn't fit into the structured fields. Common in operational systems.

### 11. Document Attachments

The existing system has a `Document` model with S3 storage. Dedicated cross connects should be able to attach documents (LOAs, test reports, photos). The `testReport` field could reference a `Document` instead of being a simple string URL.

### 12. Status Transition Guard

Even though this is a simplified model, enforce valid status transitions:

- `draft` → `submitted` → `in_progress` → `completed` → `disconnected`
- Prevent skipping states (e.g., `draft` → `completed`)
- Prevent backward transitions (e.g., `completed` → `draft`)
- This follows the existing state machine pattern in the codebase.

### 13. Soft Delete

Instead of hard-deleting cross connects, use a `deletedAt` timestamp. This preserves billing history and audit trails. The list query filters out soft-deleted records unless explicitly requested.

### 14. Rate Limiting

Apply the existing `ThrottlerModule` rate limits to SP endpoints, especially:

- Team invite (prevent spam invites)
- Ticket creation (prevent abuse)
- CSV export (prevent excessive load)
