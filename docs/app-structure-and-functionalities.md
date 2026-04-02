# CrossConnect Platform — App Structure & Functionalities

## Overview

CrossConnect is a datacenter interconnection management platform built as a **pnpm monorepo** using Turborepo. It handles the full lifecycle of cross-connect orders — from customer request to physical installation, billing, and audit.

**Stack:**

- **Backend:** NestJS (`apps/api`) — TypeScript, Prisma ORM, pg-boss for jobs
- **Frontend:** Next.js 15 App Router (`apps/web`) — TypeScript, TailwindCSS, next-auth v5
- **Database:** PostgreSQL via Prisma (`packages/db`)
- **Shared types:** `packages/types` — Zod schemas + TypeScript interfaces
- **Storage:** S3-compatible (MinIO for local dev)
- **Monorepo packages prefix:** `@xc/`

---

## Repository Layout

```
apps/
  api/          NestJS REST API (port 3100)
  web/          Next.js web app (port 3210)
packages/
  db/           Prisma schema, migrations, generated client, seed
  types/        Shared Zod schemas + TS enums/interfaces
docs/           Architecture decisions, migration guides, scope docs
docker-compose.yml   Local dev services (postgres:5433, minio:9000/9001)
```

---

## 1. Backend API (`apps/api`)

### 1.1 Auth Module

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login; returns JWT access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Get current authenticated user profile |

**Details:**

- JWT bearer token strategy
- Rate-limited: login 10 req/min, refresh 20 req/min
- `RolesGuard` + `@Roles()` decorator enforces RBAC on all endpoints
- `@CurrentUser()` decorator injects authenticated user into controllers

---

### 1.2 Organizations Module

**Endpoints:**
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/organizations` | ops | List all organizations (paginated) |
| GET | `/organizations/:id` | ops | Get organization detail |
| POST | `/organizations` | super_admin | Create organization |
| PATCH | `/organizations/:id` | super_admin | Update org name/contact |
| PATCH | `/organizations/:id/deactivate` | super_admin | Soft-deactivate org |
| GET | `/organizations/:orgId/users` | ops, customer_admin | List users in org |
| POST | `/organizations/:orgId/users` | ops, customer_admin | Create and assign user to org |
| GET | `/organizations/users/:userId` | ops, customer_admin | Get user by ID |
| PATCH | `/organizations/users/:userId/role` | super_admin, customer_admin | Update user role |
| PATCH | `/organizations/users/:userId/deactivate` | super_admin, customer_admin | Deactivate user |
| PATCH | `/organizations/users/:userId/reactivate` | super_admin, customer_admin | Reactivate user |

**User Roles:**

- `super_admin` — full platform access
- `ops_manager` — operator: manage orders, approvals, inventory
- `ops_technician` — operator: execute work orders
- `customer_admin` — manage own org users + all customer actions
- `customer_orderer` — submit/cancel orders, disconnect services
- `customer_viewer` — read-only access

---

### 1.3 Locations Module

Manages the physical datacenter hierarchy.

**Hierarchy:** Site → Building → Room → Cage → Rack → Panel → Port

**Key Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/locations/sites` | List or create sites |
| GET/POST | `/locations/sites/:id/buildings` | Buildings per site |
| GET/POST | `/locations/buildings/:id/rooms` | Rooms per building |
| GET | `/locations/rooms/:id/topology` | Full panel + port + demarc tree (MMR view) |
| GET/POST | `/locations/rooms/:id/cages` | Cages in a room |
| GET/POST | `/locations/racks/:id/panels` | Panels in a rack |
| GET/POST | `/locations/panels/:id/ports` | Ports on panel (supports bulk create) |
| POST | `/locations/demarc-points` | Create carrier/customer demarc point |

**Details:**

- MMR rooms hold direct-mount panels (ODF/FDF)
- Demarc points mark customer/carrier handoff with LOA/CFA references
- Cage ownership enables cage-level access control

---

### 1.4 Inventory Module

Tracks port capacity and availability across the datacenter.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/inventory/panels/:panelId/availability` | Port count by state |
| GET | `/inventory/panels/:panelId/ports` | All ports with state detail |
| GET | `/inventory/panels/:panelId/ports/available` | Available ports only |
| GET | `/inventory/racks/:rackId/panels` | Panels in rack with availability summary |
| GET | `/inventory/rooms/:roomId/panels` | Direct-mount panels (MMR/telco closet) |
| GET | `/inventory/sites/:siteId/availability` | Site-wide capacity summary |
| PATCH | `/inventory/ports/:portId/state` | Manually set port state (fault/maintenance/decommission) |

**Port State Machine:**

```
available → reserved → in_use → faulty / maintenance / decommissioned
```

---

### 1.5 Cross-Connects Module

Manages customer orders and provisioned services — the core business domain.

#### Orders

**State Machine:**

```
draft → submitted → under_review → pending_approval → approved
                                                     → rejected
(cancelled from: draft / submitted / under_review / pending_approval)
```

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders` | List orders (paginated, filter by state/org) |
| GET | `/orders/:id` | Order detail with endpoints |
| POST | `/orders` | Create draft order |
| PATCH | `/orders/:id/submit` | Submit order (draft → submitted) |
| PATCH | `/orders/:id/review` | Begin ops intake (submitted → under_review) |
| PATCH | `/orders/:id/feasibility` | Confirm technical feasibility (→ pending_approval) |
| PATCH | `/orders/:id/approve` | Approve & auto-create service record |
| PATCH | `/orders/:id/reject` | Reject with reason |
| PATCH | `/orders/:id/cancel` | Cancel from any pre-approval state |

#### Services

**State Machine:**

```
provisioning → active → suspended → active (resume)
                      → pending_disconnect → disconnected
```

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/services` | List services (paginated) |
| GET | `/services/:id` | Service with cable paths & endpoints |
| PATCH | `/services/:id/disconnect` | Request disconnection |
| PATCH | `/services/:id/abort-provisioning` | Abort before field work |
| PATCH | `/services/:id/suspend` | Suspend active service |
| PATCH | `/services/:id/resume` | Resume suspended service |
| PATCH | `/services/:id/extend` | Extend temporary service expiry |

---

### 1.6 Topology Module

Manages physical cable paths — the implementation layer beneath services.

**State Machine:** `planned → installed → active → rerouting → decommissioned`

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/services/:id/cable-paths` | List paths for service |
| POST | `/services/:id/cable-paths` | Plan path (atomically reserves ports) |
| GET | `/services/:id/cable-paths/:pathId` | Path detail with segments and port info |
| PATCH | `/services/:id/cable-paths/:pathId/installed` | Mark physically installed |
| PATCH | `/services/:id/cable-paths/:pathId/activate` | Activate; ports → in_use |
| PATCH | `/services/:id/cable-paths/:pathId/decommission` | Release port reservations |

**Segment Types:** `patch`, `trunk`, `jumper`, `demarc_extension`

---

### 1.7 Reservations Module

Manages port reservation lifecycle. Port reservations are created atomically when a cable path is planned and released on order cancellation/rejection.

- `reserveForOrder()` — validates port available, creates reservation, sets `port.state = reserved`
- `releaseForOrder()` — releases all ports tied to an order

---

### 1.8 Approvals Module

Multi-step approval workflow for cross-connect orders.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/approvals/queue` | Pending approvals (oldest first) |
| GET | `/approvals/:id` | Approval request with step history |
| POST | `/approvals/:id/decide` | Record decision: approved / rejected / deferred |

**Details:**

- One `ApprovalRequest` per order; immutable once decided
- MVP: single approval step; Phase 2 adds multi-step workflow

---

### 1.9 Work Orders Module

Field work instructions for technicians.

**State Machine:**

```
created → assigned → in_progress → pending_test → completed
                                 ← test_failed ←
(cancelled from any non-terminal state)
```

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/work-orders` | List work orders (paginated, filterable) |
| GET | `/work-orders/:id` | Work order with task list |
| POST | `/work-orders` | Create work order |
| PATCH | `/work-orders/:id/assign` | Assign to technician |
| PATCH | `/work-orders/:id/start` | Technician starts work |
| PATCH | `/work-orders/:id/pending-test` | Physical work done, awaiting test |
| PATCH | `/work-orders/:id/test-failed` | Failed test, return to remediation |
| PATCH | `/work-orders/:id/complete` | Complete; triggers service activation |
| PATCH | `/work-orders/:id/cancel` | Cancel work order |

**Details:**

- Auto-created when an order is approved (install work order)
- Standard task lists based on work type (install/disconnect/repair)
- Completion triggers service state transition

---

### 1.10 Documents Module

File management for LOAs, CFAs, test results, and photos.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/documents/orders/:orderId/upload` | Upload doc for order (multipart/form-data) |
| POST | `/documents/work-orders/:woId/upload` | Upload doc for work order |
| GET | `/documents/:id/download-url` | Presigned S3 URL (1-hour expiry) |
| GET | `/documents/orders/:orderId` | List docs for order |
| GET | `/documents/work-orders/:woId` | List docs for work order |

**Details:**

- Accepted types: PDF, PNG, JPG, XLSX, CSV
- Max file size: 50 MB
- Local filesystem backend (dev) or S3-compatible (prod)

---

### 1.11 Billing Events Module

Append-only billing signal events for external billing system integration.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing-events/pending` | Unexported events (polling endpoint) |
| GET | `/billing-events/services/:serviceId` | Events for a specific service |
| POST | `/billing-events/mark-exported` | Mark events as exported |

**Event Types:** `service_activated`, `service_disconnected`, `temporary_extended`, `reroute_completed`

**Details:**

- Append-only; never deleted
- Billing system polls for unexported events and marks them
- Each event captures an immutable snapshot of MRC/NRC amounts in cents

---

### 1.12 Audit Module

Compliance audit trail — immutable append-only log.

**Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit` | Paginated log with filters (entity type, action, actor, date range) |
| GET | `/audit/orders/:orderId` | Audit trail for specific order |
| GET | `/audit/:entityType/:entityId` | Audit trail for any entity |

**Details:**

- Polymorphic: tracks orders, services, work orders, any entity type
- Captures actor, entity, action, diff, IP, user agent, timestamp

---

## 2. Frontend (`apps/web`)

### 2.1 Customer Portal (`/portal`)

| Route                   | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `/portal`               | Dashboard: active service count, order summaries, quick actions       |
| `/portal/orders`        | List customer's own orders with state badges                          |
| `/portal/orders/new`    | New order form (service type, media, endpoints)                       |
| `/portal/orders/[id]`   | Order detail: endpoints, documents, service link, state-aware banners |
| `/portal/services`      | Active cross-connect services                                         |
| `/portal/services/[id]` | Service detail: endpoints, cable paths, billing events                |
| `/portal/team`          | Team member list (name clickable for admin)                           |
| `/portal/team/new`      | Invite user (firstName, lastName, role)                               |
| `/portal/team/[userId]` | User detail: role change dropdown, deactivate/reactivate              |

**Access control:**

- `customer_viewer` — read-only; redirected away from `/portal/orders/new`; no "Request New" button
- `customer_orderer` — submit/cancel orders, disconnect services
- `customer_admin` — full customer access + team management

---

### 2.2 Operator Portal (`/`)

| Route               | Description                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `/`                 | Dashboard: KPI cards (pending approvals, open work orders, active services), recent activity |
| `/orders`           | All orders across all orgs; filterable by state/org; paginated                               |
| `/orders/[id]`      | Order detail: metadata, endpoints, state transitions, documents, approval history            |
| `/work-orders`      | Work order list; filterable by state/type                                                    |
| `/work-orders/[id]` | Technician task checklist, progress bar, document upload, state transitions                  |
| `/services`         | Active/in-progress services                                                                  |
| `/services/[id]`    | Service detail: endpoints, cable paths, work order status, billing timeline                  |
| `/inventory`        | Port availability views per site/room/panel; port state management                           |
| `/locations`        | Full hierarchy browser; create site/building/room/cage/rack/panel; bulk port creation        |
| `/approvals`        | Approval queue (oldest first); approve/reject/defer                                          |
| `/audit`            | Searchable audit log with entity filters                                                     |
| `/organizations`    | List/create orgs; manage users per org                                                       |
| `/billing`          | Billing events tracking; export management                                                   |

---

### 2.3 Auth Pages (`/(auth)`)

- `/login` — Email/password login
- `/logout` — Session termination

---

### 2.4 API Client (`apps/web/src/lib/api/`)

Typed fetch wrappers for each API module. Key details:

- `UserDto`: `{ id, email, firstName, lastName, role, orgId, isActive, lastLoginAt?, createdAt }`
- `CreateUserInput`: uses `firstName` + `lastName` (not `displayName`)
- `orgsApi`: `getUser`, `updateUserRole`, `reactivateUser`, `deactivateUser`

---

### 2.5 Layout & Navigation

- **Collapsible sidebar:**
  - Desktop (≥lg): collapsible icon-rail or full sidebar
  - Mobile (<lg): hidden sidebar with fixed top bar + hamburger → slide-in drawer overlay
- **Auth:** next-auth v5 with JWT session; `AUTH_TRUST_HOST=true` required

---

## 3. Database Schema (`packages/db`)

### Identity

| Model          | Key Fields                                                                         |
| -------------- | ---------------------------------------------------------------------------------- |
| `Organization` | `id, name, orgType (operator/customer/carrier/cloud_provider/exchange), isActive`  |
| `User`         | `id, email, passwordHash, firstName, lastName, role, orgId, isActive, lastLoginAt` |

### Location Hierarchy

| Model         | Key Fields                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| `Site`        | `id, name, address, orgId`                                                                    |
| `Building`    | `id, name, siteId`                                                                            |
| `Room`        | `id, name, roomType (standard/MMR/telco_closet/common_area), buildingId`                      |
| `Cage`        | `id, name, cageOwnerId (orgId), roomId`                                                       |
| `Rack`        | `id, name, cageId`                                                                            |
| `Panel`       | `id, name, panelType (patch_panel/ODF/FDF/demarc/splice_enclosure), rackId/roomId`            |
| `Port`        | `id, label, portState (available/reserved/in_use/faulty/maintenance/decommissioned), panelId` |
| `DemarcPoint` | `id, orgId, panelId, loaRef, cfaRef, demarcType`                                              |

### Commercial Layer

| Model                 | Key Fields                                                   |
| --------------------- | ------------------------------------------------------------ |
| `CrossConnectOrder`   | `id, orgId, state, serviceType, mediaType, speed, createdAt` |
| `OrderEndpoint`       | `id, orderId, side (a/z), desiredPanelId, orgId, demarcId`   |
| `CrossConnectService` | `id, orderId, state, mrcCents, nrcCents, activatedAt`        |
| `ServiceEndpoint`     | `id, serviceId, side (a/z), panelId, portId`                 |

### Physical Layer

| Model             | Key Fields                                                    |
| ----------------- | ------------------------------------------------------------- |
| `CablePath`       | `id, serviceId, pathRole (primary/diverse), state, plannedAt` |
| `PathSegment`     | `id, pathId, sequence, fromPortId, toPortId, segmentType`     |
| `PortReservation` | `id, portId, orderId, reservedBy, reservedAt, releasedAt`     |

### Operations

| Model                 | Key Fields                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| `ApprovalRequest`     | `id, orderId, state (pending/decided)`                                      |
| `ApprovalStep`        | `id, requestId, approverId, decision, notes, decidedAt`                     |
| `WorkOrder`           | `id, serviceId, type, state, assignedTo, createdAt`                         |
| `WorkOrderTask`       | `id, workOrderId, sequence, label, state`                                   |
| `Document`            | `id, entityType, entityId, s3Key, filename, mimeType, uploadedBy`           |
| `BillingTriggerEvent` | `id, serviceId, eventType, exportedAt, mrcCents, nrcCents`                  |
| `AuditEvent`          | `id, entityType, entityId, action, actorId, diff, ip, userAgent, createdAt` |

---

## 4. Shared Types (`packages/types`)

- **Domain DTOs:** `CrossConnectOrderDto`, `CrossConnectServiceDto`, `ServiceEndpointDto`, `CablePathDto`, `PathSegmentDto`, `WorkOrderDto`, `DocumentDto`
- **API Schemas (Zod):** Request/response validation for all endpoints; used by both API and web
- **Enums:** Re-exported from `@xc/db`; used by both API and web

Build shared types after edits: `pnpm --filter @xc/types build`

---

## 5. Infrastructure Components

| Component                 | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `JwtAuthGuard`            | Validates bearer tokens on all protected endpoints          |
| `RolesGuard` + `@Roles()` | Enforces role-based access control                          |
| `@CurrentUser()`          | Injects authenticated user into controller handlers         |
| `ZodValidationPipe`       | Validates request bodies against Zod schemas                |
| `PrismaModule`            | NestJS Prisma integration with PostgreSQL                   |
| `StorageModule`           | Abstracts local filesystem vs S3-compatible storage         |
| `JobsModule`              | Background jobs via pg-boss (expiry monitoring, cleanup)    |
| `ThrottlerModule`         | Rate limiting: 100 req/60s default; overridden per endpoint |

---

## 6. Key Architectural Patterns

### Two-Layer Domain Model

- **Service layer (commercial):** `CrossConnectOrder` / `CrossConnectService` / `ServiceEndpoint` — captures customer intent, approval, billing
- **Physical layer:** `CablePath` / `PathSegment` — implements service on specific ports and panels
- Benefit: billing is independent of physical reroutes; technician work scoped to `CablePath`

### State Machines

Every core entity follows an explicit state machine with allowed transitions enforced in the service layer. No direct state writes — transitions via dedicated PATCH endpoints.

### Immutability

- Order endpoints frozen after submission
- Approval decisions immutable once made
- Audit log and billing events are append-only and never deleted

### Org-Scoped Visibility

- Customers see only their own org's orders, services, and users
- Operators (ops_manager / ops_technician) see all orgs
- `RolesGuard` enforces this at the endpoint level

---

## 7. Local Development

```bash
# Start infrastructure
docker compose up -d postgres minio

# Install dependencies and initialize DB
pnpm install
pnpm db:migrate:dev
pnpm db:seed

# Start all services (API + Web + types watch)
pnpm dev

# Or start individually
cd apps/api && pnpm dev   # → http://localhost:3100
cd apps/web && pnpm dev   # → http://localhost:3210
```

**Environment variables:**

- `DATABASE_URL` — PostgreSQL connection string (port 5433 in Docker)
- `API_PORT=3100`
- `NEXT_PUBLIC_API_URL=http://localhost:3100`
- `NEXTAUTH_URL=http://localhost:3210`
- `AUTH_TRUST_HOST=true`

---

## 8. Documentation & ADRs

| File                                        | Description                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/phase-2-scope.md`                     | Phase 2 roadmap: feasibility workflow, port reservations, work order automation, topology tracking, billing triggers, document management |
| `docs/adr/0001-modular-monolith.md`         | Decision: single NestJS process with bounded modules (vs microservices); can extract later                                                |
| `docs/adr/0002-two-layer-domain-model.md`   | Decision: separate commercial service layer from physical cable path layer                                                                |
| `docs/migrations/001-order-intake-slice.md` | Migration guide for order intake slice                                                                                                    |
| `docs/test-procedure.md`                    | Manual and automated test procedures                                                                                                      |
