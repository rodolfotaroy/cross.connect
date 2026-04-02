# CrossConnect Platform — Full Audit & Test Plan

**Prepared by:** QA Lead / Software Auditor  
**Date:** 2026-03-24  
**Source document:** `docs/app-structure-and-functionalities.md`  
**Scope:** Backend API, Frontend web app, Database schema, RBAC, State machines, Billing & Audit integrity

---

## 1. Executive Summary

CrossConnect is a B2B SaaS platform managing the **full lifecycle of datacenter cross-connect orders** — from customer request through physical cable installation to billing. It is a **stateful, multi-tenant, role-gated system** with hard compliance requirements (immutable audit, append-only billing), reactive side effects (service activation triggered by work order completion), and strict physical resource management (port reservations).

The platform is architecturally sound, with clear domain separation and explicit state machines. However, several **critical risk areas** exist where incorrect implementation could cause data leaks, stuck resources, revenue errors, or security violations.

### Top 10 Highest-Risk Areas

| #   | Risk Area                                                  | Severity | Reason                                                                                       |
| --- | ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| 1   | **Org-scoped data isolation**                              | Critical | Customers reading another org's orders/services/docs = data breach                           |
| 2   | **Port reservation atomicity**                             | Critical | Two concurrent orders reserving the same port = double-booking                               |
| 3   | **Work order completion triggering service activation**    | Critical | Non-atomic transition = service activated without WO completing, or activated twice          |
| 4   | **State machine enforcement**                              | Critical | Direct PATCH to state field, or missing guard on forbidden transitions = corrupted lifecycle |
| 5   | **Approval immutability**                                  | High     | Double-decide on same ApprovalRequest = duplicate service creation                           |
| 6   | **Billing event append-only**                              | High     | Any mutation or deletion = revenue/compliance failure                                        |
| 7   | **Audit event append-only**                                | High     | Any mutation = compliance violation                                                          |
| 8   | **Document presigned URL access control**                  | High     | Org A downloads Org B's document via guessed/leaked URL                                      |
| 9   | **Frontend route protection (server-side vs client-side)** | High     | client-only guard bypassable; `customer_viewer` reaches new order form                       |
| 10  | **Refresh token replay**                                   | Medium   | Non-rotating refresh tokens reusable after logout                                            |

### Overall Audit Priorities

1. **Security first:** RBAC enforcement, org isolation, token handling
2. **State integrity second:** All state machines, side effects, and atomicity
3. **Data integrity third:** Append-only guarantees, frozen endpoints, reservation release
4. **Contract consistency fourth:** DTO alignment between API and frontend
5. **UX correctness fifth:** Role-conditional rendering, route protection, loading/error states

---

## 2. Domain Understanding

### 2.1 Modules

| Module         | Role in System                                                                     |
| -------------- | ---------------------------------------------------------------------------------- |
| Auth           | Token issuance, identity verification, session management                          |
| Organizations  | Multi-tenant management; user provisioning and RBAC assignment                     |
| Locations      | Physical datacenter hierarchy (site → port); source of truth for infrastructure    |
| Inventory      | Port availability queries; port state management                                   |
| Cross-Connects | Core business domain — orders (commercial intent) + services (provisioned reality) |
| Topology       | Physical implementation — cable paths, segments, port reservations                 |
| Reservations   | Port reservation lifecycle; called by Topology, released by cancellation/rejection |
| Approvals      | Approval workflow gate before service creation                                     |
| Work Orders    | Field execution; technician task tracking; completion triggers service activation  |
| Documents      | File attachment to orders and work orders (LOA, CFA, test results)                 |
| Billing Events | Append-only billing signals for external billing system integration                |
| Audit          | Append-only compliance trail for all entity changes                                |

### 2.2 Roles

| Role               | Type     | Access Scope                                                          |
| ------------------ | -------- | --------------------------------------------------------------------- |
| `super_admin`      | Operator | Full platform; org management; user role changes                      |
| `ops_manager`      | Operator | All orders, services, inventory, approvals; cannot manage orgs        |
| `ops_technician`   | Operator | Assigned work orders only; cannot approve orders or manage orgs       |
| `customer_admin`   | Customer | Own org data + team management (invite, role, deactivate)             |
| `customer_orderer` | Customer | Own org orders/services; submit/cancel/disconnect; no team management |
| `customer_viewer`  | Customer | Read-only; own org's orders and services                              |

### 2.3 Core Entity Relationships

```
Organization (1) ─── (N) User
Organization (1) ─── (N) CrossConnectOrder
CrossConnectOrder (1) ─── (2) OrderEndpoint
CrossConnectOrder (1) ─── (1) ApprovalRequest
CrossConnectOrder (1) ─── (1) CrossConnectService [on approval]
CrossConnectService (1) ─── (2) ServiceEndpoint
CrossConnectService (1) ─── (N) CablePath
CrossConnectService (1) ─── (N) WorkOrder
CrossConnectService (1) ─── (N) BillingTriggerEvent
CablePath (1) ─── (N) PathSegment
PathSegment (1) ─── (1) Port [fromPort]
PathSegment (1) ─── (1) Port [toPort]
Port (N) ─── (1) Panel
Panel (N) ─── (1) Rack or Room
WorkOrder (1) ─── (N) WorkOrderTask
Order/WorkOrder (1) ─── (N) Document
Any entity (1) ─── (N) AuditEvent [polymorphic]
```

### 2.4 Critical Workflows

| Workflow                          | Modules Involved                      | Side Effects                                                                                  |
| --------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Order approval                    | CrossConnects + Approvals             | Service created; install WO auto-created; port reservations confirmed                         |
| Order rejection/cancellation      | CrossConnects + Reservations          | Port reservations released                                                                    |
| Work order completion             | WorkOrders + CrossConnects (Services) | Service state → active; billing event `service_activated` created                             |
| Service disconnection             | CrossConnects + WorkOrders            | Disconnect WO created; on WO completion: ports released, billing event `service_disconnected` |
| Cable path activation             | Topology + Inventory                  | Port states → in_use; billing precondition met                                                |
| Port reservation on path planning | Topology + Reservations + Inventory   | Ports atomically reserved                                                                     |
| Document upload                   | Documents + Storage                   | File stored; metadata saved; entity linked                                                    |
| Billing polling                   | BillingEvents                         | External system marks events exported; immutable thereafter                                   |

---

## 3. Spec Gaps / Ambiguities / Questions

| #   | Area                                   | Issue                                                                                                                                      | Why It Matters                                                                                    | Suggested Clarification                                                                                  |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Order cancellation                     | Spec does not explicitly state that `cancel` triggers `releaseForOrder()` to release port reservations                                     | Ports remain reserved indefinitely, starving inventory                                            | Confirm cancel always calls `ReservationsService.releaseForOrder()`                                      |
| 2   | Service disconnect flow                | `PATCH /services/:id/disconnect` moves to `pending_disconnect` — but what transitions it to `disconnected`? No endpoint documented.        | Disconnect may never complete; ports never released                                               | Clarify: is a disconnect WorkOrder auto-created? Who marks service as disconnected?                      |
| 3   | Work order auto-creation               | Spec says install WO is "auto-created when order is approved" — is this in the same DB transaction as approval?                            | If async and fails: service is approved with no WO; technicians never get work                    | Require atomic creation in same transaction or explicit retry/compensating mechanism                     |
| 4   | Approval deferred state                | `ApprovalDecision` includes `deferred` — no described effect on order state                                                                | Order could be stuck in `pending_approval` forever with no UI path                                | Define what `deferred` does: does the order stay pending? Can it be re-decided? Set a deferral deadline? |
| 5   | Port state after reject                | Order rejected — spec does not explicitly say ports are released                                                                           | Ports remain reserved, blocking other orders                                                      | Confirm `releaseForOrder()` runs on both reject and cancel                                               |
| 6   | Multiple active cable paths            | A service can have primary + diverse paths (ADR 0002). Can both be `active` simultaneously?                                                | Port counts doubled; billing implications unclear                                                 | Define: can both paths be active? Are ports on both paths billed?                                        |
| 7   | ops_technician forbidden actions       | Spec only says technicians "execute work orders". No explicit forbidden list.                                                              | Technician may be able to access /orders, /approvals, /billing without guard                      | Define explicit endpoint-level RBAC for ops_technician                                                   |
| 8   | customer_orderer cancel scope          | Spec says cancel from draft/submitted/under_review/pending_approval. Does `customer_orderer` cancel at all stages or only draft/submitted? | If under_review, should ops be notified before cancel completes?                                  | Clarify which roles can cancel at each state                                                             |
| 9   | Temporary service expiry               | Jobs module handles expiry. No spec on what happens: auto-disconnect? Notify? BillingEvent?                                                | Revenue loss or service left active past expiry                                                   | Fully define the temporary expiry job: what state does service transition to?                            |
| 10  | LOA/CFA references on DemarcPoint      | `DemarcPoint` has `loaRef` and `cfaRef` fields — are these Document IDs (foreign keys) or free-text reference strings?                     | If free-text, there's no referential integrity; Documents module is disconnected from Demarc flow | Define field types and add FK if these are Document IDs                                                  |
| 11  | Refresh token rotation                 | Spec says `/auth/refresh` refreshes the access token. Does it issue a new refresh token and invalidate the old one?                        | Non-rotating refresh tokens can be replayed after logout/compromise                               | Require refresh token rotation (issue new refresh, invalidate old)                                       |
| 12  | Document presigned URL scope           | `GET /documents/:id/download-url` returns a presigned S3 URL. Is access verified against requesting user's org?                            | Org A user guesses/receives a document ID from Org B and downloads it                             | Confirm the endpoint checks `document.entity.orgId === currentUser.orgId`                                |
| 13  | Password policy                        | Spec has no password complexity or hashing algorithm mentioned                                                                             | Weak stored passwords; brute force risk                                                           | Define minimum length, complexity, confirm bcrypt (cost ≥ 12)                                            |
| 14  | Audit diff format                      | `AuditEvent.diff` field format is undefined                                                                                                | Inconsistent records; audit is not machine-readable                                               | Standardize diff format (e.g., JSON Patch RFC 6902 or `{before, after}` snapshot)                        |
| 15  | Billing event creation trigger         | Spec says `service_activated` is an event type — but which code path creates it? Work order completion? Cable path activation?             | If both paths can trigger it, duplicate billing events are created                                | One authoritative trigger point; deduplication guard                                                     |
| 16  | ops_technician scope on work orders    | Can a technician see/start ALL work orders or only assigned ones?                                                                          | Over-broad access could allow technician to claim another org's work                              | Clarify whether GET /work-orders returns only assigned WOs for technicians                               |
| 17  | Approval one-per-order guarantee       | Spec says "one ApprovalRequest per order" — is this enforced at DB level (unique constraint) or application logic?                         | Race condition could create two ApprovalRequests for one order                                    | Add unique index on `ApprovalRequest.orderId`                                                            |
| 18  | Service creation DTO                   | When order is approved and service is created, which fields populate `ServiceEndpoint`? Are ports assigned during approval or later?       | If no ports assigned yet, ServiceEndpoint may be incomplete                                       | Define what ServiceEndpoint contains at approval vs after topology planning                              |
| 19  | mark-exported idempotency              | `POST /billing-events/mark-exported` — is it idempotent? What if called twice with same IDs?                                               | Double acknowledgement could cause issues in downstream billing system                            | Confirm operation is idempotent (already-exported IDs are no-ops)                                        |
| 20  | Frontend auth — server vs client guard | Spec says `customer_viewer` is "redirected away from /portal/orders/new" — is this Next.js middleware (server) or client-side redirect?    | Client-only redirect is bypassable via direct URL navigation; API must also reject                | Confirm middleware.ts guards the route server-side                                                       |

---

## 4. Module-by-Module Audit Checklist

### 4.1 Auth Module

#### What Must Work

- Login returns valid JWT access + refresh tokens
- Me endpoint returns current user with correct role/org
- Expired access token is rejected (401)
- Valid refresh token issues new access token
- Rate limiter blocks excessive login attempts

#### Positive Tests

- `POST /auth/login` with valid credentials → 200 + `{accessToken, refreshToken}`
- `GET /auth/me` with valid JWT → 200 + user profile including `role`, `orgId`, `firstName`, `lastName`
- `POST /auth/refresh` with valid refresh token → 200 + new `accessToken`

#### Negative Tests

- `POST /auth/login` with wrong password → 401 (not 500, not 400)
- `POST /auth/login` with nonexistent email → 401 (do not reveal that email doesn't exist)
- `GET /auth/me` with no token → 401
- `GET /auth/me` with malformed JWT → 401
- `GET /auth/me` with expired token → 401
- `POST /auth/refresh` with invalid/expired refresh token → 401
- 11th login attempt within 60s → 429 Too Many Requests

#### Edge Cases

- Login for a deactivated user → 401 (confirm deactivated users cannot authenticate)
- JWT with tampered payload (modified role claim) → 401
- Refresh token used twice (rotation test) → second use should return 401

#### Role/Permission Checks

- All protected endpoints return 401 with no token
- All protected endpoints return 403 with valid token but wrong role

#### Data Integrity

- `passwordHash` is bcrypt or argon2 — never returned in API responses
- `lastLoginAt` updated on successful login

---

### 4.2 Organizations Module

#### What Must Work

- `super_admin` and `ops_manager` can list all orgs
- `customer_admin` can list/manage users within their own org only
- User creation sends correct role to DB
- User deactivation/reactivation is reflected immediately on next auth

#### Positive Tests

- `GET /organizations` as `ops_manager` → paginated list of all orgs
- `GET /organizations/:id` as `ops_manager` → org detail
- `POST /organizations` as `super_admin` → org created, 201
- `GET /organizations/:orgId/users` as `customer_admin` (own org) → user list with `isActive` field
- `POST /organizations/:orgId/users` as `customer_admin` → user created with customer role
- `PATCH /organizations/users/:userId/role` as `super_admin` → role updated
- `PATCH /organizations/users/:userId/deactivate` → isActive=false
- `PATCH /organizations/users/:userId/reactivate` → isActive=true
- Deactivated user cannot login

#### Negative Tests

- `POST /organizations` as `ops_manager` → 403
- `GET /organizations/:orgId/users` where orgId ≠ currentUser.orgId as `customer_admin` → 403
- `PATCH .../role` assigning `super_admin` as `customer_admin` → 403 (customer_admin cannot elevate to super_admin)
- `PATCH .../role` as `ops_manager` → 403 (only super_admin or customer_admin)
- `POST /organizations/:orgId/users` with `role: super_admin` as `customer_admin` → 403
- Creating user with duplicate email → 409 Conflict

#### Edge Cases

- Deactivate org's last `customer_admin` — is this allowed? Does the org lose admin access?
- Reactivate user whose org has been deactivated — should still fail login
- `customer_admin` deactivates themselves — should this be blocked?

#### Data Integrity

- `UserDto` never exposes `passwordHash`
- `isActive` default is `true` on user creation
- Role changes are recorded in AuditEvent

---

### 4.3 Locations Module

#### What Must Work

- Full hierarchy readable by operators
- Create endpoints restricted to `ops_manager` and `super_admin`
- Topology endpoint (MMR view) returns accurate panel/port/demarc tree
- Bulk port creation correctly creates N ports with sequential labels

#### Positive Tests

- `GET /locations/sites` → list all sites with names and IDs
- `GET /locations/rooms/:id/topology` → tree including panels, ports with states, and demarc points
- `POST /locations/panels/:id/ports` with `count: 24` → 24 ports created, sequential labels
- `POST /locations/demarc-points` with valid panel + org → demarc created

#### Negative Tests

- `POST /locations/sites` as `customer_admin` → 403
- `POST /locations/sites` as `ops_technician` → 403
- `GET /locations/sites` as `customer_viewer` without explicit permission → test expected behavior (should customers see site lists for order forms?)
- Create building with nonexistent siteId → 404

#### Edge Cases

- Delete or decommission a panel that has ports in `in_use` state — should block
- Room with both racks (cages) and direct-mount panels (MMR) — topology returns both correctly
- Hierarchical delete cascade — if a cage is deleted, are racks and panels also cleaned up?

---

### 4.4 Inventory Module

#### What Must Work

- Availability counts are accurate (available + reserved + in_use counts match actual DB counts)
- Port state manual transitions work only for valid states
- Site-wide availability aggregates correctly

#### Positive Tests

- `GET /inventory/panels/:id/availability` → `{available: N, reserved: M, in_use: K, ...}` matches actual port counts
- `GET /inventory/panels/:id/ports/available` → only ports with `portState=available`
- `PATCH /inventory/ports/:id/state` with `{state: "faulty"}` as `ops_manager` → port state updated

#### Negative Tests

- `PATCH /inventory/ports/:id/state` with `{state: "in_use"}` — manual transition to `in_use` should be forbidden (only via topology activation)
- `PATCH /inventory/ports/:id/state` with `{state: "reserved"}` — same, forbidden
- `PATCH /inventory/ports/:id/state` as `customer_admin` → 403
- Nonexistent port ID → 404

#### Edge Cases

- Port in `in_use` state — can it be manually set to `faulty`? Define expected behavior
- After faulty port repaired — is there an `available` transition? (not documented)
- Availability count includes ports across all panel types?

#### Data Integrity

- After reservation: `portState=reserved`; after path activation: `portState=in_use`; after decommission: `portState=available` (or decommissioned)
- Counts are consistent with query on all ports

---

### 4.5 Cross-Connect Orders

#### What Must Work

- Customer can only see their own org's orders
- Operators can see all orders
- State transitions are enforced — only valid PATCH endpoints available at each state
- Order endpoints frozen post-submission (immutable)
- Endpoints validated (desiredPanelId exists and is valid)

#### Positive Tests

- `POST /orders` as `customer_orderer` → 201, state=draft
- `PATCH /orders/:id/submit` as `customer_orderer` → state=submitted
- `PATCH /orders/:id/review` as `ops_manager` → state=under_review
- `PATCH /orders/:id/feasibility` as `ops_manager` → state=pending_approval
- `PATCH /orders/:id/approve` as `ops_manager` → state=approved; service created; install WO created
- `PATCH /orders/:id/reject` as `ops_manager` with reason → state=rejected; ports released
- `PATCH /orders/:id/cancel` as `customer_orderer` from draft/submitted → state=cancelled; ports released

#### Negative Tests

- `GET /orders` as `customer_orderer` → only own org's orders (not others)
- `PATCH /orders/:id/review` as `customer_orderer` → 403
- `PATCH /orders/:id/approve` as `ops_technician` → 403
- Approve an already-approved order → 409 or 422
- Cancel an already-approved order → 422 (terminal state)
- Cancel an already-rejected order → 422
- `PATCH /orders/:id/feasibility` when state=draft → 422

#### Edge Cases

- Two customers submit orders for the same port simultaneously → only one should succeed reservation
- `customer_admin` vs `customer_orderer` — both can submit? Both can cancel?
- Order submitted with invalid panelId → 404 or 422?
- `customer_viewer` calls `POST /orders` → 403

#### Data Integrity

- After submission, `OrderEndpoint` fields cannot be changed
- `CrossConnectService` and `WorkOrder` created atomically on approval
- `ApprovalRequest` created on submit or on review?

---

### 4.6 Cross-Connect Services

#### What Must Work

- Service record created only on order approval
- State transitions match documented machine
- Customer sees only own org's services
- Disconnect flow creates a disconnect work order (and this WO completion triggers `disconnected` state)

#### Positive Tests

- `GET /services` as `customer_orderer` → own org's services only
- `GET /services/:id` as `ops_manager` → full detail with cable paths and endpoints
- `PATCH /services/:id/disconnect` → state=pending_disconnect; disconnect WO created
- `PATCH /services/:id/suspend` → state=suspended
- `PATCH /services/:id/resume` → state=active
- `PATCH /services/:id/extend` on temporary service → expiry updated

#### Negative Tests

- `PATCH /services/:id/suspend` when state=provisioning → 422
- `PATCH /services/:id/resume` when state=active → 422
- `PATCH /services/:id/disconnect` as `customer_viewer` → 403
- `PATCH /services/:id/extend` on non-temporary service → 422
- `GET /services` as `customer_orderer` from org A → does not return org B services

#### Edge Cases

- Disconnect on an already `pending_disconnect` service → idempotent or 422?
- Abort provisioning on an `active` service → 422
- Service with active temporary expiry receives `extend` call with past date → 422

---

### 4.7 Topology Module

#### What Must Work

- Path planning atomically reserves all ports in segments
- If any port in path is unavailable, the whole plan fails (no partial reservation)
- Path state transitions are enforced
- Port states follow path state (planned → ports reserved; active → ports in_use; decommissioned → ports released)

#### Positive Tests

- `POST /services/:id/cable-paths` with valid port segments → path created with state=planned; all ports → reserved
- `PATCH .../installed` → state=installed
- `PATCH .../activate` → state=active; all ports in path → in_use
- `PATCH .../decommission` → state=decommissioned; all ports → available (or back to available from in_use)

#### Negative Tests

- Plan path with a port that's already `reserved` by another path → 409
- Plan path with a port that's `in_use` → 409
- Plan path with a port that's `faulty` → 409
- `PATCH .../activate` when state=planned (skip installed) → 422
- `PATCH .../decommission` when state=planned (not yet installed) → test expected behavior
- Plan cable path for a service in `disconnected` state → 422

#### Edge Cases

- Two concurrent requests to plan a cable path using the same port → one should fail (atomic via transaction or SELECT FOR UPDATE)
- Path with zero segments → 422
- Port on a decommissioned panel → reject at planning time

#### Data Integrity

- `PortReservation` record created for each port with reservedAt and reservedBy
- On decommission: `PortReservation.releasedAt` set; port back to available
- `pathSegment.sequence` is contiguous (1, 2, 3...) and unique per path

---

### 4.8 Reservations Module

#### What Must Work

- `reserveForOrder()` validates port availability before reserving
- `releaseForOrder()` releases all reservations for an order atomically
- Called correctly on cancel and reject

#### Positive Tests

- Reserve available port: port.state → reserved; PortReservation created
- Release: port.state → available; PortReservation.releasedAt set

#### Negative Tests

- Reserve port that is already reserved → error (can't double-reserve)
- Reserve port that is in_use → error
- Reserve port that is faulty → error

#### Edge Cases

- Release when no reservations exist → no-op or error?
- Partial release (some ports already released by different flow) → remaining ports released correctly

---

### 4.9 Approvals Module

#### What Must Work

- One ApprovalRequest per order
- Request immutable once decided
- Queue shows only pending requests
- Deferred decision must have defined behavior

#### Positive Tests

- `GET /approvals/queue` → only state=pending requests, sorted oldest first
- `POST /approvals/:id/decide` with `{decision: "approved"}` → request state=decided; order → approved
- `POST /approvals/:id/decide` with `{decision: "rejected", reason: "..."}` → request state=decided; order → rejected

#### Negative Tests

- `POST /approvals/:id/decide` on already-decided request → 409 Conflict
- `POST /approvals/:id/decide` as `customer_admin` → 403
- `POST /approvals/:id/decide` as `ops_technician` → 403
- `POST /approvals/:id/decide` with missing `decision` field → 422

#### Edge Cases

- `{decision: "deferred"}` → order stays in pending_approval; can be re-decided later
- Approval decide with `approved` while order was cancelled by customer in a race condition → 422 (order not in valid state)

#### Data Integrity

- `ApprovalStep.approverId` matches the authenticated user making the decision
- `ApprovalStep.decidedAt` timestamp is server-generated (not client-provided)
- After approve: `CrossConnectService` AND `WorkOrder` both exist in same transaction

---

### 4.10 Work Orders Module

#### What Must Work

- Install WO auto-created on order approval
- Task list appropriate to work type
- Only assignee or ops_manager can transition states
- Completion triggers service activation AND billing event

#### Positive Tests

- On order approval: WO exists with state=created and full task list
- `PATCH /work-orders/:id/assign` with `{technicianId}` → state=assigned
- `PATCH /work-orders/:id/start` → state=in_progress
- `PATCH /work-orders/:id/pending-test` → state=pending_test
- `PATCH /work-orders/:id/test-failed` → state=in_progress (regression)
- `PATCH /work-orders/:id/complete` → state=completed; service.state=active; BillingTriggerEvent(service_activated) created

#### Negative Tests

- `PATCH /work-orders/:id/start` before assign → 422
- `PATCH /work-orders/:id/complete` when state=in_progress (skip pending_test) → 422
- `PATCH /work-orders/:id/complete` as `customer_orderer` → 403
- `PATCH /work-orders/:id/assign` on completed WO → 422

#### Edge Cases

- Complete WO while service is already active (double completion) → idempotent? Or 422?
- Cancel a WO that is assigned — does it release anything?
- Disconnect WO complete → service → disconnected; ports released
- ops_technician completes a WO for an org they have no relation to → should still work (they're platform staff)

#### Data Integrity

- Exactly one BillingTriggerEvent created per WO completion (no duplicates)
- AuditEvent created for WO state change with actorId
- Task completion tracked individually

---

### 4.11 Documents Module

#### What Must Work

- Upload enforces MIME type validation (not just extension)
- 50 MB size limit enforced server-side
- Presigned URL is org-scoped (requester must have access to the entity)
- Documents linked to correct entity (order or WO)

#### Positive Tests

- `POST /documents/orders/:orderId/upload` with valid PDF, <50 MB → 201; document accessible
- `GET /documents/:id/download-url` → presigned URL; URL expires after ~1 hour
- `GET /documents/orders/:orderId` → list of documents for that order

#### Negative Tests

- Upload a `.exe` file with `Content-Type: application/octet-stream` → 415 Unsupported
- Upload a file renamed to `.pdf` but with binary content → MIME sniffing should reject
- Upload 51 MB file → 413 Payload Too Large
- `GET /documents/:id/download-url` for a document belonging to org B as customer from org A → 403
- Upload to an order that doesn't exist → 404
- Upload to an order from a different org → 403

#### Edge Cases

- Upload fails mid-transfer (S3 interrupted) → no orphaned DB record
- Same file uploaded twice → two separate document records (no dedup by content)
- Large filename or special characters in filename → sanitized before storage

---

### 4.12 Billing Events Module

#### What Must Work

- Events are only created by the system (no "create billing event" user endpoint)
- Events are never deleted
- Events are never updated (except `exportedAt` via mark-exported)
- `mark-exported` is idempotent

#### Positive Tests

- After WO complete (service activated): `GET /billing-events/services/:serviceId` → event with `eventType=service_activated` exists
- `GET /billing-events/pending` → returns events where `exportedAt IS NULL`
- `POST /billing-events/mark-exported` with `{ids: [...]}` → those events now have `exportedAt` set
- Re-calling `mark-exported` with same IDs → 200, no error, no data change

#### Negative Tests

- `DELETE /billing-events/:id` → 404 (endpoint does not exist)
- `PATCH /billing-events/:id` to change `mrcCents` → 404 (endpoint does not exist)
- `POST /billing-events/pending` as `customer_admin` → 403
- `POST /billing-events/mark-exported` with nonexistent IDs → 404 or silent skip (define expected)

#### Edge Cases

- Service activated, then immediately suspended — does `service_activated` event still exist and is no reversal event created?
- Temporary service extended multiple times → multiple `temporary_extended` events

---

### 4.13 Audit Module

#### What Must Work

- Events created for every state change and sensitive action
- Events are never deletable or updatable via API
- Filters return correct results

#### Positive Tests

- After order submit: `GET /audit/orders/:orderId` → event with `action=order_submitted`
- After user deactivate: `GET /audit/...` → event with `actorId` matching the admin who deactivated
- Pagination: page 1 and page 2 of `GET /audit` return non-overlapping, consecutive records
- Date range filter returns only events in range

#### Negative Tests

- `DELETE /audit/:id` → 404 or 405 (endpoint does not exist)
- `PATCH /audit/:id` → 404 or 405
- `GET /audit` as `customer_admin` → 403 (or filtered to own org only — define expected)
- `GET /audit/orders/:orderId` for an order from a different org → 403

#### Edge Cases

- Very large audit log (10k+ events) — pagination is stable (consistent ordering)
- Actor deleted (user deactivated) — audit event still has `actorId` (FK or string snapshot)

---

### 4.14 Frontend — Customer Portal

#### What Must Work

- All pages load without error for appropriate roles
- Role-conditional rendering hides/shows correct actions
- Server-side route protection blocks unauthorized access
- Order form submits correctly and navigates to order detail

#### Positive Tests

- `customer_admin` visits `/portal/team` → see all users; deactivate button visible
- `customer_orderer` visits `/portal/team` → cannot see deactivate button; no invite button
- `customer_viewer` visits `/portal` → dashboard loads; no "Request New" button
- `customer_viewer` visits `/portal/orders` → list loads read-only
- `customer_admin` invites new user: fills firstName, lastName, email, role → user created; appears in list
- Order detail at `/portal/orders/[id]` for approved order → service link present; correct banner

#### Negative Tests

- `customer_viewer` navigates to `/portal/orders/new` directly → redirected (server-side 307/302)
- `customer_orderer` navigates to `/portal/team/new` → redirected or 403
- Customer from org A navigates to `/portal/orders/[idFromOrgB]` → 404 or 403 (not just blank)

#### Edge Cases

- Session expires mid-form-fill → next submit redirects to login with return URL
- API error on order submit → error message displayed; form not cleared
- Empty state: no orders → empty state UI shown (not a blank table)
- Long team list (50+ users) → pagination or scroll works

---

### 4.15 Frontend — Operator Portal

#### What Must Work

- Operators see all orgs' data
- State transition buttons match current entity state
- Work order task checklist persists task completion
- Technician cannot perform ops_manager actions

#### Positive Tests

- `ops_manager` on `/orders/[id]` in state `submitted` → "Begin Review" button visible; no "Approve" button
- `ops_manager` on `/orders/[id]` in state `pending_approval` → "Approve" and "Reject" buttons visible
- `ops_technician` on `/work-orders/[id]` assigned to them → "Start Work" visible; task checklist interactive
- Approval page: queue sorted oldest-first; clicking approve updates page state
- Work order progress bar updates as tasks completed

#### Negative Tests

- `ops_technician` navigates to `/approvals` → 403 or redirect
- `ops_technician` navigates to `/organizations` → 403 or redirect
- `ops_manager` on `/orders/[id]` in state `approved` → no state transition buttons (terminal)

#### Edge Cases

- Work order with 0 tasks (edge case in auto-creation) → progress bar shows 0/0; complete button visible?
- File upload in work-order detail: upload 40 MB file → progress indicator; success message
- Operator filters orders by org → only that org's orders shown

---

### 4.16 Shared Types / API Contract Consistency

#### What Must Work

- Frontend `UserDto` shape matches API response: `{id, email, firstName, lastName, role, orgId, isActive, lastLoginAt?, createdAt}`
- `CreateUserInput` uses `firstName` + `lastName` (not `displayName`)
- Zod schemas in `@xc/types` match API validation
- Enums used in frontend match enum values accepted by API

#### Tests

- Make API call, compare response shape to TypeScript DTO definition — no extra or missing fields
- Submit form with `displayName` field → API rejects (wrong field name)
- Use a deleted/renamed enum value → TypeScript compilation error or runtime 422
- Build `@xc/types` and confirm no type errors in consuming packages

---

## 5. State Machine Audit

### 5.1 Orders

| From State         | Via Endpoint | To State           | Valid?     | Side Effects                                               |
| ------------------ | ------------ | ------------------ | ---------- | ---------------------------------------------------------- |
| `draft`            | submit       | `submitted`        | ✅         | AuditEvent                                                 |
| `submitted`        | review       | `under_review`     | ✅         | AuditEvent; ApprovalRequest created?                       |
| `under_review`     | feasibility  | `pending_approval` | ✅         | AuditEvent                                                 |
| `pending_approval` | approve      | `approved`         | ✅         | CrossConnectService created; WorkOrder created; AuditEvent |
| `pending_approval` | reject       | `rejected`         | ✅         | Ports released; AuditEvent                                 |
| `draft`            | cancel       | `cancelled`        | ✅         | Ports released (if any); AuditEvent                        |
| `submitted`        | cancel       | `cancelled`        | ✅         | Ports released; AuditEvent                                 |
| `under_review`     | cancel       | `cancelled`        | ✅         | Ports released; AuditEvent                                 |
| `pending_approval` | cancel       | `cancelled`        | ✅         | Ports released; AuditEvent                                 |
| `approved`         | cancel       | —                  | ❌ BLOCKED | Must return 422                                            |
| `rejected`         | cancel       | —                  | ❌ BLOCKED | Must return 422                                            |
| `approved`         | submit       | —                  | ❌ BLOCKED | Must return 422                                            |
| `submitted`        | approve      | —                  | ❌ BLOCKED | Must return 422 (wrong state)                              |

**Critical test:** Approve an order that is in `submitted` state (not `pending_approval`) — must return 422.

**Forbidden direct state mutation:** `PATCH /orders/:id` with `{state: "approved"}` must be blocked — no such endpoint should exist.

---

### 5.2 Services

| From State           | Via Endpoint               | To State             | Valid?       | Side Effects                                              |
| -------------------- | -------------------------- | -------------------- | ------------ | --------------------------------------------------------- |
| `provisioning`       | _(WO complete)_            | `active`             | ✅           | BillingTriggerEvent(service_activated)                    |
| `provisioning`       | abort-provisioning         | `disconnected`       | ✅           | Ports released? AuditEvent                                |
| `active`             | disconnect                 | `pending_disconnect` | ✅           | Disconnect WO created?                                    |
| `active`             | suspend                    | `suspended`          | ✅           | AuditEvent                                                |
| `suspended`          | resume                     | `active`             | ✅           | AuditEvent                                                |
| `pending_disconnect` | _(disconnect WO complete)_ | `disconnected`       | ✅           | BillingTriggerEvent(service_disconnected); Ports released |
| `active`             | resume                     | —                    | ❌ BLOCKED   | Already active                                            |
| `suspended`          | disconnect                 | —                    | ❓ UNDEFINED | Should suspended services be disconnectable?              |
| `disconnected`       | any                        | —                    | ❌ BLOCKED   | Terminal state                                            |
| `provisioning`       | suspend                    | —                    | ❌ BLOCKED   | Cannot suspend unprovisioned service                      |

**Unresolved:** Can a `suspended` service be disconnected? Spec is silent.

---

### 5.3 Cable Paths

| From State       | Via Endpoint     | To State         | Valid?       | Side Effects                                                       |
| ---------------- | ---------------- | ---------------- | ------------ | ------------------------------------------------------------------ |
| _(new)_          | POST cable-paths | `planned`        | ✅           | Ports → reserved; PortReservation created                          |
| `planned`        | installed        | `installed`      | ✅           | AuditEvent                                                         |
| `installed`      | activate         | `active`         | ✅           | Ports → in_use; BillingEvent trigger?                              |
| `active`         | decommission     | `decommissioned` | ✅           | Ports → available; PortReservation.releasedAt set                  |
| `planned`        | activate         | —                | ❌ BLOCKED   | Must pass through installed                                        |
| `planned`        | decommission     | —                | ❓ UNDEFINED | Can you decommission an uninstalled path? Releases reserved ports? |
| `decommissioned` | any              | —                | ❌ BLOCKED   | Terminal state                                                     |

---

### 5.4 Work Orders

| From State     | Via Endpoint | To State       | Valid?     | Side Effects                               |
| -------------- | ------------ | -------------- | ---------- | ------------------------------------------ |
| `created`      | assign       | `assigned`     | ✅         | AuditEvent                                 |
| `assigned`     | start        | `in_progress`  | ✅         | AuditEvent                                 |
| `in_progress`  | pending-test | `pending_test` | ✅         | AuditEvent                                 |
| `pending_test` | test-failed  | `in_progress`  | ✅         | AuditEvent (regression)                    |
| `pending_test` | complete     | `completed`    | ✅         | Service → active; BillingEvent; AuditEvent |
| `created`      | cancel       | `cancelled`    | ✅         | AuditEvent                                 |
| `assigned`     | cancel       | `cancelled`    | ✅         | AuditEvent                                 |
| `in_progress`  | cancel       | `cancelled`    | ✅         | AuditEvent                                 |
| `completed`    | cancel       | —              | ❌ BLOCKED | Terminal                                   |
| `created`      | start        | —              | ❌ BLOCKED | Must assign first                          |
| `in_progress`  | complete     | —              | ❌ BLOCKED | Must pass pending_test                     |

---

### 5.5 Port States

| From State  | To State         | Via                     | Valid?                           |
| ----------- | ---------------- | ----------------------- | -------------------------------- |
| `available` | `reserved`       | Path planning (atomic)  | ✅                               |
| `reserved`  | `in_use`         | Path activation         | ✅                               |
| `in_use`    | `available`      | Path decommission       | ✅                               |
| `available` | `faulty`         | Manual PATCH            | ✅                               |
| `available` | `maintenance`    | Manual PATCH            | ✅                               |
| `available` | `decommissioned` | Manual PATCH            | ✅                               |
| `in_use`    | `faulty`         | Manual PATCH            | ❓ Should be blocked or allowed? |
| `reserved`  | `available`      | Release (cancel/reject) | ✅                               |
| Any         | `in_use`         | Manual PATCH            | ❌ BLOCKED                       |
| Any         | `reserved`       | Manual PATCH            | ❌ BLOCKED                       |

---

### 5.6 Approval Requests

| From State | Via              | To State   | Valid?       | Side Effects                           |
| ---------- | ---------------- | ---------- | ------------ | -------------------------------------- |
| `pending`  | decide(approved) | `decided`  | ✅           | Order → approved; Service + WO created |
| `pending`  | decide(rejected) | `decided`  | ✅           | Order → rejected; Ports released       |
| `pending`  | decide(deferred) | `pending`? | ❓ UNDEFINED | Order stays pending_approval?          |
| `decided`  | decide(anything) | —          | ❌ BLOCKED   | Immutable; must return 409             |

---

## 6. RBAC and Data Isolation Audit

### 6.1 Permission Matrix

| Action                      | super_admin | ops_manager | ops_technician | customer_admin          | customer_orderer | customer_viewer |
| --------------------------- | ----------- | ----------- | -------------- | ----------------------- | ---------------- | --------------- |
| Create org                  | ✅          | ❌          | ❌             | ❌                      | ❌               | ❌              |
| List all orgs               | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| List own org users          | ✅          | ✅          | ❌             | ✅                      | ❌               | ❌              |
| Invite user to org          | ✅          | ✅          | ❌             | ✅ (own org)            | ❌               | ❌              |
| Change user role            | ✅          | ❌          | ❌             | ✅ (own org, non-super) | ❌               | ❌              |
| Deactivate user             | ✅          | ❌          | ❌             | ✅ (own org)            | ❌               | ❌              |
| List all orders             | ✅          | ✅          | ❌             | ❌ (own only)           | ❌ (own only)    | ❌ (own only)   |
| Create order                | ✅          | ✅          | ❌             | ✅                      | ✅               | ❌              |
| Submit order                | ✅          | ✅          | ❌             | ✅                      | ✅               | ❌              |
| Cancel order                | ✅          | ✅          | ❌             | ✅                      | ✅               | ❌              |
| Review/Approve/Reject order | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| List all services           | ✅          | ✅          | ❌             | ❌ (own only)           | ❌ (own only)    | ❌ (own only)   |
| Disconnect service          | ✅          | ✅          | ❌             | ✅                      | ✅               | ❌              |
| Suspend/Resume service      | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Plan cable path             | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Activate cable path         | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Assign work order           | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Start/complete work order   | ✅          | ✅          | ✅             | ❌                      | ❌               | ❌              |
| Manage port states          | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Upload documents            | ✅          | ✅          | ✅             | ✅ (own org)            | ✅ (own org)     | ❌              |
| Download documents          | ✅          | ✅          | ✅             | ✅ (own org)            | ✅ (own org)     | ✅ (own org)    |
| View billing events         | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Mark billing exported       | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| View audit log              | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |
| Create/manage locations     | ✅          | ✅          | ❌             | ❌                      | ❌               | ❌              |

### 6.2 Data Isolation Tests

| Test                                                                                      | Method | Expected                   |
| ----------------------------------------------------------------------------------------- | ------ | -------------------------- |
| Org A `customer_orderer` calls `GET /orders`                                              | GET    | Only org A orders returned |
| Org A `customer_admin` calls `GET /organizations/:orgBId/users`                           | GET    | 403                        |
| Org A `customer_orderer` calls `GET /services`                                            | GET    | Only org A services        |
| Org A user calls `GET /documents/orders/:orderIdFromOrgB`                                 | GET    | 403 or 404                 |
| Org A user calls `GET /documents/:docIdFromOrgB/download-url`                             | GET    | 403                        |
| `ops_technician` calls `POST /auth/login` then `GET /approvals/queue`                     | GET    | 403                        |
| `customer_viewer` calls `POST /orders`                                                    | POST   | 403                        |
| `customer_admin` calls `PATCH /organizations/users/:userId/role` with `role: super_admin` | PATCH  | 403                        |
| Org A `customer_admin` calls `PATCH /organizations/users/:userFromOrgB/deactivate`        | PATCH  | 403                        |
| `ops_technician` calls `PATCH /orders/:id/approve`                                        | PATCH  | 403                        |

---

## 7. Critical End-to-End Test Scenarios

### S01 — Happy Path: Full Order Lifecycle

**Preconditions:** Org A exists; `customer_orderer` user exists; available ports exist on panels X and Y; `ops_manager` exists.

**Steps:**

1. `customer_orderer` logs in → receives JWT
2. `POST /orders` with A-side panel X, Z-side panel Y, mediaType=smf → 201, state=draft
3. `PATCH /orders/:id/submit` → 200, state=submitted
4. `ops_manager` calls `PATCH /orders/:id/review` → state=under_review
5. `ops_manager` calls `PATCH /orders/:id/feasibility` → state=pending_approval
6. `ops_manager` calls `PATCH /orders/:id/approve` → state=approved; service created (state=provisioning); install WO created (state=created)
7. `ops_manager` calls `PATCH /work-orders/:woId/assign` with technicianId → state=assigned
8. `ops_technician` calls `PATCH /work-orders/:woId/start` → state=in_progress
9. `ops_manager` plans cable path: `POST /services/:serviceId/cable-paths` with segments using ports on panels X and Y → ports reserved
10. `PATCH .../installed` → state=installed
11. `PATCH .../activate` → state=active; ports now in_use
12. `ops_technician` calls `PATCH /work-orders/:woId/pending-test` → state=pending_test
13. `ops_technician` calls `PATCH /work-orders/:woId/complete` → WO=completed; service → active; BillingTriggerEvent created
14. Verify: `GET /billing-events/services/:serviceId` → event with eventType=service_activated, exportedAt=null
15. Billing system polls: `GET /billing-events/pending` → event present
16. Billing system calls: `POST /billing-events/mark-exported` → exportedAt set
17. Verify: `GET /audit/orders/:orderId` → full trail of all state changes with correct actorIds

**Expected result:** Full lifecycle completes; service active; billing event exported; audit complete.  
**Failure indicators:** Missing WO after approval; ports not changing state; no billing event; wrong actorId in audit.

---

### S02 — Order Rejection Path

**Preconditions:** Order in `pending_approval` state with port reservations.

**Steps:**

1. `ops_manager` calls `POST /approvals/:id/decide` with `{decision: "rejected", reason: "No cable capacity"}`
2. Verify: order state=rejected; service NOT created; install WO NOT created
3. Verify: all reserved ports → available (PortReservation.releasedAt set)
4. Verify: audit event created

**Failure indicators:** Ports remain reserved; service accidentally created; rejection reason not stored.

---

### S03 — Customer Cancellation

**Preconditions:** Order in `submitted` state with port reservations.

**Steps:**

1. `customer_orderer` calls `PATCH /orders/:id/cancel`
2. Verify: state=cancelled; ports released
3. `customer_orderer` calls `PATCH /orders/:id/submit` again → 422 (terminal state)

**Failure indicators:** Ports not released; cancel from terminal state succeeds.

---

### S04 — Work Order Failure / Remediation

**Preconditions:** WO in `pending_test` state.

**Steps:**

1. `ops_technician` calls `PATCH /work-orders/:id/test-failed` → state=in_progress
2. Verify: service still in `provisioning` state (not activated)
3. Technician fixes issue, calls `PATCH .../pending-test` again
4. `PATCH .../complete` → service activated

**Failure indicators:** Service activated before WO completes; duplicate billing event.

---

### S05 — Service Disconnect Path

**Preconditions:** Service in `active` state; cable path active; ports in_use.

**Steps:**

1. `customer_orderer` calls `PATCH /services/:id/disconnect` → service=pending_disconnect
2. Verify: disconnect WO created
3. Ops assigns, starts, completes disconnect WO
4. Verify: service=disconnected; cable path=decommissioned; ports=available; billing event(service_disconnected) created

**Failure indicators:** Disconnect WO not created; ports remain in_use after disconnect; no billing event.

---

### S06 — Document Upload and Org Isolation

**Preconditions:** Two orgs (A and B) each have an order.

**Steps:**

1. Org A `customer_admin` uploads LOA to their order: `POST /documents/orders/:orderA_Id/upload`
2. Get document ID from response
3. Org B `customer_admin` calls `GET /documents/:docId/download-url` → 403

**Failure indicators:** Org B received presigned download URL for org A document.

---

### S07 — Billing Export and Idempotency

**Steps:**

1. Service activated → BillingTriggerEvent created
2. `POST /billing-events/mark-exported` with `{ids: [eventId]}` → exportedAt set
3. `POST /billing-events/mark-exported` again with same IDs → 200, no change
4. `GET /billing-events/pending` → event no longer in list

**Failure indicators:** Second mark-exported call fails; event reappears in pending list.

---

### S08 — Frontend Route Protection

**Steps:**

1. Log in as `customer_viewer`
2. Navigate to `/portal/orders/new` → server returns 302/307 redirect to `/portal` (not rendered)
3. Navigate to `/portal/team/new` → redirect
4. Navigate to `/portal/orders` → page loads read-only (no "Request New" button visible)
5. Log in as `customer_orderer`
6. Navigate to `/portal/team` → page loads but deactivate button is absent; invite button absent

**Failure indicators:** `customer_viewer` can access `/portal/orders/new`; no server-side guard.

---

### S09 — Concurrent Port Reservation (Race Condition)

**Steps:**

1. Two `customer_orderer` users from different orgs submit orders simultaneously, both targeting the same panel port
2. Both request cable path planning for the same port
3. Verify: exactly one succeeds (201); the other gets 409 Conflict
4. Verify: port has one PortReservation, not two

**Failure indicators:** Both succeed; port has two reservations; inventory count incorrect.

---

### S10 — Audit Trail Completeness

**Steps:**

1. Perform order submit → review → feasibility → approve → WO assign → start → complete chain
2. Call `GET /audit/orders/:orderId`
3. Verify each state transition has a corresponding AuditEvent with:
   - Correct `action` field
   - Correct `actorId` matching the user who performed the action
   - Correct `entityType=CrossConnectOrder` and `entityId`
   - Timestamp in correct chronological order

**Failure indicators:** Missing events; wrong actorId; events not in chronological order.

---

## 8. API Test Plan

### 8.1 Endpoint Groups and Coverage

| Group          | Endpoints                     | Key Tests                                   |
| -------------- | ----------------------------- | ------------------------------------------- |
| Auth           | login, refresh, me            | Credentials, token expiry, rate limiting    |
| Organizations  | CRUD, user management         | Org isolation, role restrictions            |
| Locations      | Hierarchy CRUD, topology      | Operator-only create; hierarchy integrity   |
| Inventory      | Availability, port state      | Read accuracy; forbidden manual transitions |
| Orders         | Full CRUD + state transitions | State machine; role checks; org filter      |
| Services       | List + state transitions      | State machine; org filter                   |
| Topology       | Cable path CRUD + transitions | Atomicity; port state sync                  |
| Approvals      | Queue + decide                | Immutability; role restrictions             |
| Work Orders    | Full CRUD + state transitions | State machine; side effects                 |
| Documents      | Upload + download-url         | MIME/size; org isolation                    |
| Billing Events | Pending + mark-exported       | Append-only; idempotency                    |
| Audit          | Read-only queries             | No mutation; org isolation                  |

### 8.2 Request Validation Tests

| Scenario                                       | Expected Response              |
| ---------------------------------------------- | ------------------------------ |
| Missing required field in POST body            | 422 Unprocessable Entity       |
| Wrong type (string where number expected)      | 422                            |
| Unknown field in body (extra properties)       | 422 or ignored (define policy) |
| Empty string for required string field         | 422                            |
| Invalid enum value                             | 422                            |
| Negative number for size/speed field           | 422                            |
| Future date for a timestamp that should be now | 422 or server-generated        |

### 8.3 Auth Tests

| Test                               | Expected   |
| ---------------------------------- | ---------- |
| No Authorization header            | 401        |
| `Authorization: Bearer invalid`    | 401        |
| Expired JWT                        | 401        |
| JWT signed with wrong secret       | 401        |
| Valid JWT, wrong role for endpoint | 403        |
| Deactivated user's valid JWT       | 401 or 403 |

### 8.4 Pagination / Filter Tests

| Test                                   | Expected                                         |
| -------------------------------------- | ------------------------------------------------ |
| `GET /orders?page=0&limit=10`          | 10 results; `total`, `page`, `limit` in response |
| `GET /orders?state=approved`           | Only approved orders                             |
| `GET /orders?page=9999` (beyond total) | Empty results array; no error                    |
| `GET /orders?limit=1000` (over max)    | Capped at defined max (e.g., 100) or 422         |
| Filter by orgId as operator            | Only that org's orders                           |

### 8.5 Expected HTTP Status Codes

| Scenario                            | Expected Code |
| ----------------------------------- | ------------- |
| Successful GET                      | 200           |
| Successful POST (creation)          | 201           |
| Successful PATCH (state transition) | 200           |
| Resource not found                  | 404           |
| Forbidden (wrong role)              | 403           |
| Unauthenticated                     | 401           |
| Invalid state transition            | 422           |
| Conflict (duplicate)                | 409           |
| Payload too large                   | 413           |
| Unsupported media type              | 415           |
| Rate limit exceeded                 | 429           |
| Validation error                    | 422           |

---

## 9. Frontend Test Plan

### 9.1 Navigation

- All sidebar links resolve to correct routes for each role
- Active route highlighted in sidebar
- Mobile hamburger opens drawer; closing works; overlay click closes drawer
- Breadcrumbs (if any) reflect correct hierarchy

### 9.2 Route Protection (most critical)

| Route                    | Allowed Roles                    | Blocked Roles                     |
| ------------------------ | -------------------------------- | --------------------------------- |
| `/portal/orders/new`     | customer_admin, customer_orderer | customer_viewer                   |
| `/portal/team`           | customer_admin                   | customer_orderer, customer_viewer |
| `/portal/team/new`       | customer_admin                   | customer_orderer, customer_viewer |
| `/portal/team/[userId]`  | customer_admin                   | customer_orderer, customer_viewer |
| `/` (operator dashboard) | ops\_\*                          | customer\_\*                      |
| `/approvals`             | ops_manager, super_admin         | ops*technician, customer*\*       |
| `/organizations`         | ops_manager, super_admin         | ops*technician, customer*\*       |

**Verification method:** Each blocked role must receive a server-side redirect (HTTP 30x), not just a client-side hook — confirm in Network tab.

### 9.3 Conditional Rendering by Role

| Element                                      | Visible To                       | Hidden From                       |
| -------------------------------------------- | -------------------------------- | --------------------------------- |
| "Request New Cross-Connect" button           | customer_admin, customer_orderer | customer_viewer                   |
| Deactivate user button on `/portal/team`     | customer_admin                   | customer_orderer, customer_viewer |
| Invite user button on `/portal/team`         | customer_admin                   | others                            |
| Role dropdown on `/portal/team/[userId]`     | customer_admin                   | others                            |
| "Approve" / "Reject" buttons on order detail | ops_manager, super_admin         | ops_technician                    |
| "Start Work" button on WO detail             | ops_technician, ops_manager      | customer\_\*                      |

### 9.4 Forms and Validation

- Required fields show error on blur or submit attempt
- Email field validates format
- Role dropdown shows only valid customer roles (not super*admin, not ops*\*)
- Order form endpoint fields validate panel existence (or show 404 error from API)
- File upload shows progress and disables submit during upload
- File rejected by server shows error (not silent fail)

### 9.5 Loading / Error States

- Skeleton or spinner shown during data fetch
- API error (5xx) shows user-friendly error message (not raw stack trace)
- 401 from API → redirect to login
- 403 from API → "Access denied" message (not blank page)
- 404 from API → "Not found" message

### 9.6 State Badges / Banners

- Each order/service/WO state has distinct badge color and label
- On order detail page at `/portal/orders/[id]`: banner is context-aware:
  - Approved + service provisioning → "Being installed"
  - Approved + service active → "Live"
  - Approved + service pending_disconnect → "Disconnect requested"
- Banner does not show stale state after transition

### 9.7 Responsive Sidebar

- At `lg` breakpoint: sidebar is collapsible (icon-rail ↔ full)
- Below `lg`: sidebar hidden; top bar with hamburger visible
- Drawer closes when navigating to a new route on mobile

### 9.8 Session / Auth Handling

- Page reload preserves session (next-auth session persisted)
- Expired session → redirect to login with return URL
- After login, return URL redirects correctly
- Logout clears session; back navigation does not restore authenticated state

---

## 10. Data Integrity and Consistency Checks

### 10.1 Cross-Entity Consistency

| Check                                 | What to Verify                                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Order approved → service exists       | `CrossConnectService.orderId` = `CrossConnectOrder.id`; exactly one service per approved order |
| Order approved → install WO exists    | `WorkOrder.serviceId` = service.id; type=install; exactly one per approval                     |
| WO completed → service active         | `CrossConnectService.state = active`; `activatedAt` is set                                     |
| Cable path active → ports in_use      | All `PathSegment` ports have `portState = in_use`                                              |
| Path decommissioned → ports available | All `PathSegment` ports have `portState = available`                                           |
| Order rejected → no service           | No `CrossConnectService` with that orderId                                                     |
| Order cancelled → ports available     | All `PortReservation.releasedAt` non-null for that order                                       |

### 10.2 Append-Only Guarantees

- No DELETE endpoint exists for `BillingTriggerEvent` or `AuditEvent`
- No UPDATE endpoint exists that modifies `mrcCents`, `nrcCents`, or `eventType` on billing events
- No UPDATE endpoint exists that modifies any field on `AuditEvent`
- DB-level: `BillingTriggerEvent` and `AuditEvent` tables should have no UPDATE triggers and no soft-delete column

### 10.3 Frozen Order Endpoints

- After order moves from `draft` to `submitted`, `OrderEndpoint` records must not be modifiable
- Verify: `PATCH /orders/:id` with changed endpoint fields after submit → 422 or ignored
- Verify: no dedicated edit-endpoint endpoint exists post-submission

### 10.4 DTO / Schema Mismatch Risks

| Risk                                                         | Check                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| API returns `side` but frontend expects `endpointSide`       | Verify `getService()` maps correctly (known issue, already fixed per repo memory) |
| `CreateUserInput` uses `displayName` in some code paths      | Grep for `displayName` in `apps/web`                                              |
| Enum values differ between `@xc/types` build artifact and DB | Run `pnpm --filter @xc/types build` and check against schema enums                |
| Pagination response shape inconsistent across endpoints      | Check all list endpoints return same `{data, total, page, limit}` shape           |

### 10.5 Portability / Reservation Release Consistency

| Scenario                                               | Expected                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| Order cancelled from draft (no ports ever reserved)    | `releaseForOrder()` no-ops cleanly                             |
| Order cancelled from pending_approval (ports reserved) | All ports → available; all reservations have `releasedAt`      |
| Order rejected                                         | Same as above                                                  |
| Order approved then service disconnected               | Disconnect WO completion releases cable path port reservations |

---

## 11. High-Priority Automated Tests to Implement First

### P0 — Must Implement Immediately

| #    | What to Test                                                           | Why                                                    | Level             |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------ | ----------------- |
| P0-1 | Port reservation atomicity under concurrency                           | Double-booking causes physical damage and revenue loss | Integration       |
| P0-2 | Org data isolation (`GET /orders` only returns own org's)              | Data breach if violated                                | Integration       |
| P0-3 | Order state machine: all valid and invalid transitions                 | Corrupted lifecycle cannot be recovered                | Integration       |
| P0-4 | Work order completion triggers service activation (exactly once)       | Billing event duplication or missed activation         | Integration       |
| P0-5 | Approval immutability (second decide rejected with 409)                | Duplicate service/WO creation                          | Integration       |
| P0-6 | Port release on order cancel and rejection                             | Inventory starvation                                   | Integration       |
| P0-7 | `customer_viewer` blocked from `POST /orders` and `/portal/orders/new` | Unauthorized order creation                            | Integration + E2E |

### P1 — Implement Next Sprint

| #    | What to Test                                         | Why                          | Level       |
| ---- | ---------------------------------------------------- | ---------------------------- | ----------- |
| P1-1 | Billing event append-only (no mutation endpoints)    | Compliance failure           | Integration |
| P1-2 | Audit event created for every state change           | Compliance and traceability  | Integration |
| P1-3 | Document org-isolation presigned URL                 | Data breach                  | Integration |
| P1-4 | MIME type and size validation on document upload     | Security / storage abuse     | Integration |
| P1-5 | Service state machine all transitions                | Revenue integrity            | Integration |
| P1-6 | Cable path activation syncs port states              | Physical inventory integrity | Integration |
| P1-7 | Refresh token rotation (old token rejected on reuse) | Security                     | Integration |
| P1-8 | Role matrix — all forbidden endpoints return 403     | Security                     | Integration |

### P2 — Implement in Following Sprint

| #    | What to Test                                        | Why                      | Level       |
| ---- | --------------------------------------------------- | ------------------------ | ----------- |
| P2-1 | Full E2E happy path (order → WO complete → billing) | Regression safety        | E2E         |
| P2-2 | Frontend route protection by role                   | UX security              | E2E         |
| P2-3 | Pagination stability under concurrent writes        | Data correctness         | Integration |
| P2-4 | Work order task checklist persists correctly        | UX correctness           | E2E         |
| P2-5 | Temporary service expiry job                        | Revenue leakage          | Integration |
| P2-6 | Document upload progress and error UX               | UX correctness           | E2E         |
| P2-7 | Audit trail completeness E2E                        | Compliance               | E2E         |
| P2-8 | mark-exported idempotency                           | Billing system stability | Integration |

---

## 12. Manual QA Checklist

### Authentication

- [ ] Login with valid credentials → tokens received
- [ ] Login with invalid password → 401, no user info leaked
- [ ] Login for deactivated user → 401
- [ ] 11th login in 60s → 429
- [ ] Access /auth/me with expired token → 401
- [ ] Refresh with valid token → new access token
- [ ] Logout; use old refresh token → 401

### Organizations & Users

- [ ] `super_admin` creates new org → appears in list
- [ ] `customer_admin` creates user with `customer_orderer` role → logs in, can submit orders
- [ ] `customer_admin` cannot create user with `super_admin` role
- [ ] `customer_admin` cannot view another org's users
- [ ] Deactivated user cannot log in
- [ ] Reactivated user can log in

### Order Lifecycle

- [ ] `customer_orderer` creates draft order → visible in portal
- [ ] Submit order → ops can see it under `submitted`
- [ ] `ops_manager` begins review → state=under_review
- [ ] Feasibility confirmed → state=pending_approval
- [ ] Approve → state=approved; service visible; install WO exists
- [ ] Reject with reason → state=rejected; no service created
- [ ] Cancel from submitted → state=cancelled; no service created

### Work Orders

- [ ] Install WO auto-created on approval → visible in `/work-orders`
- [ ] Assign technician → state=assigned
- [ ] Start work → state=in_progress
- [ ] Test failed → state returns to in_progress
- [ ] Complete → service active; billing event in pending list

### Topology & Inventory

- [ ] Plan cable path → ports show as reserved in inventory
- [ ] Mark installed → path state=installed
- [ ] Activate path → ports show as in_use
- [ ] Decommission path → ports show as available
- [ ] Attempting to plan path with reserved port → fails

### Documents

- [ ] Upload PDF to order → downloadable via presigned URL
- [ ] Upload 51 MB file → rejected with size error
- [ ] Upload .exe file → rejected with type error
- [ ] Another org's user cannot download your document

### Billing & Audit

- [ ] Service activated → billing event appears in pending list
- [ ] Mark exported → event no longer in pending list
- [ ] Attempt to mark-exported again → no error, no change
- [ ] After each order state change → audit event present with correct actorId
- [ ] `DELETE /billing-events/:id` → 404 or 405

### Frontend — Customer Portal

- [ ] `customer_viewer` login → no "Request New" button; redirected from /orders/new
- [ ] `customer_admin` → team page accessible; invite and deactivate buttons visible
- [ ] `customer_orderer` → team page not accessible
- [ ] Order detail shows correct state banner
- [ ] Session expiry → redirect to login

### Frontend — Operator Portal

- [ ] `ops_technician` → no access to /approvals or /organizations
- [ ] `ops_manager` → all sections accessible
- [ ] Order detail → state-appropriate action buttons shown
- [ ] Work order checklist → tasks checkable; progress bar updates
- [ ] Inventory page → port states accurate

### RBAC Cross-Checks

- [ ] `customer_orderer` cannot call `PATCH /orders/:id/approve`
- [ ] `ops_technician` cannot call `GET /billing-events/pending`
- [ ] `customer_admin` from Org A cannot modify user from Org B
- [ ] `ops_manager` cannot call `POST /organizations`

---

## 13. Final Verdict Framework

### Pass Criteria (App Working Properly)

All of the following must be true:

1. **All P0 automated tests pass** with no intermittent failures
2. **All Manual QA checklist items** pass without workaround
3. **Org data isolation** confirmed — no cross-org data leak in any endpoint
4. **No invalid state transitions** achievable via any documented endpoint
5. **Audit log** is complete for all state changes (100% coverage)
6. **Billing events** are append-only and never duplicate on WO completion
7. **Port inventory** counts match actual port state counts after every operation
8. **Document upload** enforces MIME and size on server side
9. **Frontend route protection** is server-side for all restricted routes
10. **Refresh tokens** are rotated and old tokens rejected on reuse

### Partial Pass Criteria (Needs Remediation Before Production)

App is partially passing if:

- All P0 tests pass BUT one or more P1 issues are open (e.g., MIME validation only client-side)
- All core workflows complete successfully BUT audit coverage has gaps
- All RBAC checks pass BUT spec ambiguities (deferred approval, disconnect completion) are unresolved

### Fail Criteria (Block Release)

Any one of the following is a hard blocker:

| Failure                                                       | Severity                              |
| ------------------------------------------------------------- | ------------------------------------- |
| Cross-org data visible to wrong customer                      | Critical — data breach                |
| Port double-booking possible under concurrency                | Critical — physical/operational       |
| Billing event can be mutated or deleted                       | Critical — compliance                 |
| Audit event can be mutated or deleted                         | Critical — compliance                 |
| Service activated without work order completion               | Critical — revenue integrity          |
| `customer_viewer` can submit orders via API (no server guard) | Critical — security                   |
| Approval decisions not immutable (second decide succeeds)     | Critical — duplicate service creation |
| No port release on order cancellation                         | High — inventory starvation           |
| Presigned document URL accessible by wrong org                | High — data breach                    |
| Refresh tokens reusable after logout                          | High — security                       |

---

_This document should be treated as the living baseline for all testing activities. Update the spec gaps table as ambiguities are resolved with engineering. Update the P0/P1/P2 test list as tests are implemented and automated._
