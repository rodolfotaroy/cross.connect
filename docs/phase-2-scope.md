# Phase 2 — CrossConnect Platform: Post-MVP Implementation Scope

> **Status:** Planning  
> **Depends on:** Phase 1 (Order intake, feasibility, approval) fully deployed and stable  
> **Target:** Complete end-to-end service lifecycle from approved order → active cross-connect → disconnect

---

## 1. Feasibility Review Workflow

### 1.1 What it is
Phase 1 leaves `under_review` as a state with no enforced sub-process. Phase 2 adds a structured feasibility checklist that ops engineers must complete before the order can advance to `pending_approval`.

### 1.2 Schema changes
- New model `FeasibilityCheck` (FK → `CrossConnectOrder`)
  - `checkType`: enum (`port_availability`, `physical_path_possible`, `carrier_demarc_confirmed`, `loa_received`, `capacity_headroom`)
  - `result`: enum (`pass`, `fail`, `waived`)
  - `notes`: text
  - `checkedById`, `checkedAt`
- `CrossConnectOrder` gets `feasibilityCompletedAt`, `feasibilityNotes`

### 1.3 API endpoints
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/orders/:id/feasibility` | Get all checks for an order |
| `POST` | `/orders/:id/feasibility` | Add/update a check result |
| `PATCH`| `/orders/:id/confirm-feasibility` | Mark feasibility complete (all required checks passed) |

### 1.4 Web UI
- New `FeasibilityChecklist` component on the order detail page (operator only)
- Check rows with pass/fail/waive toggles
- Confirm button (disabled until all required checks are resolved)
- Timeline entry added when confirmed

---

## 2. Port Reservations

### 2.1 What it is
When an order passes feasibility, ops engineers reserve specific ports for both endpoints before the approval decision is made. This prevents concurrent assignments and provides the approving manager visibility into what will be cross-patched.

### 2.2 Current state
`PortReservation` model exists in schema but is not exercised. The `reservations` module exists as stubs.

### 2.3 Work to complete
- Implement `ReservationsService.reserveForOrder(orderId, portId, userId)` — validates port is `available`, creates `PortReservation` record, sets `Port.state = reserved`
- Implement `ReservationsService.releaseForOrder(orderId)` — releases all reservations on cancellation or rejection
- Reservation expiry job: cron task releases stale reservations older than 7 days where order is still `draft`
- `POST /orders/:id/reserve-ports` — body `{ aSidePortId, zSidePortId }`
- `DELETE /orders/:id/ports/reservations` — release
- Service must be transactional (either both ports reserved or neither)

### 2.4 Web UI
- Port picker section in operator order detail: dropdowns scoped to relevant panel for each side
- Shows current reservation status per port
- Warning badge on `PortStateBadge` when approaching expiry

---

## 3. Work Orders

### 3.1 What it is
When an order is approved, the system auto-creates a `WorkOrder` of type `install`. The assigned technician follows a task list to physically install the cross-connect, then marks each task complete and uploads test results.

### 3.2 Current state
`WorkOrder` and `WorkOrderTask` models exist. `WorkOrdersService` is stubbed (list, getOne, create, assign). Phase 1 spec only covers the list page.

### 3.3 Work to complete
- `WorkOrdersService.createForOrder(orderId)` — called automatically by `OrdersService.approve()` inside a transaction; auto-generates a standard task list based on service type
- Standard task list for `install`:
  1. `Confirm port reservations and label cable`
  2. `Pull cable from A-side to patch field`
  3. `Terminate / patch at A-side panel`
  4. `Pull cable from Z-side to patch field`
  5. `Terminate / patch at Z-side panel`
  6. `Light-level test (if SMF/MMF)`
  7. `Document with photos and test results`
- `WorkOrdersService.start(workOrderId, userId)` — `assigned → in_progress`
- `WorkOrdersService.completeTask(taskId, userId, notes)` — marks task `completed`; advances WO to `pending_test` when all tasks except test are done
- `WorkOrdersService.complete(workOrderId, userId, notes)` — `pending_test → completed`; automatically triggers `ServicesService.activate(serviceId)` if WO type is `install`
- `WorkOrdersService.cancel(workOrderId, userId, reason)`

### 3.4 API endpoints
| Method | Path | Description |
|--------|------|-------------|
| `PATCH`| `/work-orders/:id/start` | `assigned → in_progress` |
| `PATCH`| `/work-orders/:id/tasks/:taskId/complete` | Mark one task done |
| `PATCH`| `/work-orders/:id/complete` | Mark WO complete, trigger activation |
| `PATCH`| `/work-orders/:id/cancel` | Cancel WO |

### 3.5 Web UI
- `app/(operator)/work-orders/[id]/page.tsx` — detail with task list, progress bar, action buttons
- Technician-only assign/start/complete actions
- Upload test-result document from work order detail

---

## 4. Installation Progress Tracking

### 4.1 What it is
During the `in_progress` work order, the technician updates `CablePath` and `PathSegment` records as each leg of the cross-connect is physically installed.

### 4.2 Schema alignment
- `CablePath.state`: `planned → installed → active → rerouting → decommissioned`
- `PathSegment` records created by technician as each cable segment is patched
- `PathSegment` has optional `pathwayId` FK (Phase 2 introduces `Pathway` models)

### 4.3 Work to complete
- `TopologyService.createPath(serviceId, pathRole)` — called when WO starts
- `TopologyService.addSegment(pathId, fromPortId, toPortId, segmentType, cableLabel)` — adds a segment; validates port states
- `TopologyService.activatePath(pathId)` — called when WO completes; marks path `active`, sets ports `in_use`
- Endpoints: `POST /services/:id/paths`, `POST /paths/:id/segments`, `PATCH /paths/:id/activate`

### 4.4 Web UI
- Physical path viewer on service detail page (tree or table view of segments)
- Color-coded by `PathState`

---

## 5. Service Activation

### 5.1 What it is
Triggered automatically when the install work order is completed (or manually by ops for pre-existing services). After activation, a `BillingTriggerEvent` of type `service_activated` is emitted.

### 5.2 Current state
`ServicesService.activate()` exists but only does a state transition — it does not trigger billing events or work order integration.

### 5.3 Work to complete
- `ServicesService.activate(serviceId, userId)`: 
  - Validate `state === 'provisioning'`
  - Set `state = active`, `activatedAt = now()`
  - Create `BillingTriggerEvent(type=service_activated, serviceId, occurredAt)`
  - Write audit event
- `BillingEventsService` fully implemented (list, getForService) — Phase 1 is stubbed
- `POST /services/:id/activate` endpoint (for manual override by ops_manager)

### 5.4 Temporary cross-connects
- Expiry monitor: cron job runs hourly, finds `active` temporary services past `expiresAt`
- Fires `BillingTriggerEvent(type=temporary_extended)` if extended, else begins `pending_disconnect` flow
- `POST /services/:id/extend-expiry body:{ newExpiresAt }` — requires ops_manager role

---

## 6. Disconnect Handling

### 6.1 What it is
An active service may be disconnected on customer request or by ops. A disconnect `WorkOrder` is created; the technician de-patches the cable and returns ports to `available`.

### 6.2 State machine extension (already in schema)
- `CrossConnectService` fields added in Phase 1: `disconnectRequestedAt`, `disconnectReason`
- States: `active → pending_disconnect → disconnected`

### 6.3 Work to complete
- `ServicesService.requestDisconnect(serviceId, userId, reason)`: `active → pending_disconnect`
- Auto-create `WorkOrder(type=disconnect)` with standard task list (reverse of install)
- `ServicesService.disconnect(serviceId, userId)`: called when disconnect WO completes; `pending_disconnect → disconnected`; releases ports; emits `BillingTriggerEvent(type=service_disconnected)`
- `ServicesService.suspend(serviceId, userId, reason)` and `unsuspend()`: voluntary suspension path (existing stubs to be completed)
- `DELETE /services/:id` is **not** exposed — all state changes via lifecycle endpoints

### 6.4 API endpoints
| Method | Path | Description |
|--------|------|-------------|
| `PATCH`| `/services/:id/request-disconnect` | `active → pending_disconnect` |
| `PATCH`| `/services/:id/disconnect` | `pending_disconnect → disconnected` (WO complete trigger) |
| `PATCH`| `/services/:id/suspend` | `active → suspended` |
| `PATCH`| `/services/:id/unsuspend` | `suspended → active` |

### 6.5 Web UI
- Service detail page: `app/(operator)/services/[id]/page.tsx`
  - State badge, endpoint assignment, cable path summary
  - Action buttons: Request Disconnect, Suspend, Unsuspend (role-gated)
  - Billing events timeline section

---

## 7. Document Management

### 7.1 What it is
LOAs (Letters of Authorization), CFAs (Connecting Facility Assignments), test results, and photos must be attached to orders or services and downloadable.

### 7.2 Current state
`Document` model exists. `DocumentsService` is stubbed. No storage backend configured.

### 7.3 Work to complete
- Choose storage backend: local filesystem (dev) / S3-compatible (prod) via environment variable `STORAGE_BACKEND`
- `DocumentsService.upload(file, orderId|serviceId, docType, uploaderId)` — validates MIME type whitelist (`pdf`, `png`, `jpg`, `xlsx`, `csv`), stores file, returns presigned download URL
- `DocumentsService.list(entityId)`
- `DocumentsService.delete(documentId, requesterId)` — only uploader or super_admin
- Multipart upload endpoint: `POST /documents` with `multipart/form-data`
- `GET /documents/:id/download` — redirect to presigned URL (short TTL)
- `DELETE /documents/:id`

### 7.4 Security
- Validate `Content-Type` and file extension
- Scan filename for path traversal
- Enforce max file size (`UPLOAD_MAX_BYTES`, default 50 MB)
- Presigned URLs expire after 15 minutes

---

## 8. Non-Functional Work (cross-cutting)

| Item | Detail |
|------|--------|
| **Work queue** | Use Bull/BullMQ for disconnect WO trigger, billing event, expiry monitor (avoid blocking HTTP requests) |
| **Email notifications** | Nodemailer/SendGrid integration: order state changes → email to requesting org admin; work order assignment → email to technician |
| **Rate limiting** | `@nestjs/throttler` global guard (100 req/min per IP; 10 req/min for auth endpoint) |
| **Health check** | `GET /health` endpoint with DB connectivity probe |
| **Metrics** | Prometheus metrics endpoint via `@willsoto/nestjs-prometheus` |
| **End-to-end tests** | Playwright smoke tests covering: login → create order → submit → approve → activate |
| **DB migrations** | Generate named Prisma migrations for Phase 2 schema additions; no breaking changes to existing tables |

---

## 9. Acceptance Criteria (Phase 2 → Done)

1. A customer admin can log in, create an order, submit it, and see it progress through feasibility review → approval without manual DB manipulation.
2. An ops technician can be assigned a work order, complete all tasks, and the service auto-activates.
3. An ops manager can request a disconnect; the service transitions to `disconnected` after the work order is completed.
4. A `BillingTriggerEvent` is created for every `service_activated` and `service_disconnected` state change.
5. A temporary service that passes its `expiresAt` is automatically placed into `pending_disconnect`.
6. All Phase 2 endpoints are covered by integration tests (at least happy path + one rejection scenario each).
7. The audit log captures every state transition with actor and timestamp for all lifecycle changes.

---

*Document version: 1.0 — Phase 2 Planning Draft*
