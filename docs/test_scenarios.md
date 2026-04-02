# CrossConnect — Manual End-to-End Test Scenarios

Use these scenarios to simulate the full order lifecycle across all user roles.

## Roles Reference

| Role | Portal | Key Capabilities |
|------|--------|-----------------|
| `customer_orderer` | `/portal` | Submit orders, cancel orders, request disconnect |
| `customer_admin` | `/portal` | Same as orderer + manage team members |
| `customer_viewer` | `/portal` | Read-only; cannot submit or cancel |
| `ops_manager` | `/` | Review, approve/reject orders, plan cable paths, manage work orders, manage inventory |
| `ops_technician` | `/` | Start/complete work orders, mark paths installed |
| `super_admin` | `/` | Full access; manage orgs, users, all operator actions |

## State Machines Quick Reference

```
Order:    draft → submitted → under_review → pending_approval → approved / rejected
          (cancelable from: draft, submitted, under_review, pending_approval)

Service:  provisioning → active → suspended → active
                       → pending_disconnect → disconnected

CablePath: planned → installed → active → decommissioned
```

---

## Scenario 1 — Happy Path: Standard Single-Mode Fibre Cross-Connect

**Business Context:** A financial services tenant needs a direct fibre connection from their cage to the MMR for their primary internet uplink.

**Pre-condition:** Site, building, room, cage, rack, panel, and SMF ports (state: `available`) must exist in the system.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Create draft order. Service Type: `single_mode_fibre`. Media: `SMF`. Connector: `LC`. A-End: customer cage patch panel port. Z-End: MMR ODF port. Notes: "Primary internet uplink". |
| 2 | `customer_orderer` | `/portal/orders/[id]` | Submit order (draft → submitted). |
| 3 | `ops_manager` | `/orders/[id]` | Click **Begin Review** (submitted → under_review). |
| 4 | `ops_manager` | `/orders/[id]` | Click **Confirm Feasibility** (under_review → pending_approval). |
| 5 | `ops_manager` | `/orders/[id]` | Click **Approve** (pending_approval → approved). Service record auto-created. |
| 6 | `ops_manager` | `/services/[id]` | Click **Plan Cable Path**. Role: Primary. Add 1 segment: Type `patch`, cable label `SMF-A-001`. Select From Port and To Port. Click **Plan Path**. |
| 7 | `ops_manager` | `/work-orders/[id]` | Assign work order to technician. |
| 8 | `ops_technician` | `/work-orders/[id]` | Click **Start Work** (assigned → in_progress). Complete each task checklist item. |
| 9 | `ops_technician` | `/services/[id]` | Click **Mark Installed** on the cable path segment (planned → installed). |
| 10 | `ops_technician` | `/work-orders/[id]` | Click **Submit for Testing** (in_progress → pending_test). |
| 11 | `ops_manager` | `/services/[id]` | Click **Activate** on cable path (installed → active). Ports move to `in_use`. |
| 12 | `ops_manager` | `/work-orders/[id]` | Click **Complete** work order. Service transitions to `active`. |
| 13 | `customer_viewer` | `/portal/services/[id]` | Verify service shows active. Cable path and port labels visible. |

**Expected Result:** Service is `active`, cable path is `active`, both ports are `in_use`. A billing event `service_activated` is emitted.

---

## Scenario 2 — Order Rejected: Insufficient Capacity

**Business Context:** Customer requests a cross-connect but there are no available ports at the requested Z-End location.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Create and submit draft order requesting a port in a panel that is fully utilised. |
| 2 | `ops_manager` | `/orders/[id]` | Begin review. |
| 3 | `ops_manager` | `/orders/[id]` | Click **Reject**. Enter rejection reason: "No available ports on Panel ODF-MMR-1A at this time. Please contact your account manager to discuss alternatives." |
| 4 | `customer_orderer` | `/portal/orders/[id]` | Verify order shows `rejected` state and rejection reason is visible. |

**Expected Result:** Order is `rejected`. No service or port reservations created.

---

## Scenario 3 — Customer Cancels Before Submission

**Business Context:** Customer creates a draft order but changes their mind before submitting.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Create draft order. |
| 2 | `customer_orderer` | `/portal/orders/[id]` | Click **Cancel Order** while in `draft` state. |
| 3 | `customer_admin` | `/portal/orders` | Verify cancelled order appears in list with `cancelled` badge. |

**Expected Result:** Order is `cancelled`. No work order or service created.

---

## Scenario 4 — Ops Cancels During Review

**Business Context:** During technical review, ops discovers the customer's demarc point information is incorrect and the order needs to be resubmitted.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Submit an order with a placeholder Z-End port. |
| 2 | `ops_manager` | `/orders/[id]` | Begin review. |
| 3 | `ops_manager` | `/orders/[id]` | Click **Cancel**. Notes: "Incorrect Z-End endpoint specified. Please resubmit with the correct MMR panel port." |
| 4 | `customer_orderer` | `/portal/orders` | Sees order as `cancelled`. Creates a corrected new order. |

**Expected Result:** Original order `cancelled`. New order starts from `draft`.

---

## Scenario 5 — Happy Path: Multi-Segment Trunk with Patch Panels

**Business Context:** A cloud provider requires a long-haul connection spanning two MMRs in the same building, using a trunk cable between rooms and patch cords at each end.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Create order. Service type: `single_mode_fibre`. A-End: MMR-1 ODF port. Z-End: MMR-2 ODF port. |
| 2 | `customer_orderer` | `/portal/orders/[id]` | Submit. |
| 3 | `ops_manager` | `/orders/[id]` | Review → Feasibility → Approve. |
| 4 | `ops_manager` | `/services/[id]` | Plan cable path with **3 segments**: Segment 1 type `patch` label `PATCH-MMR1-001`; Segment 2 type `trunk` label `TRUNK-MR1-MR2-001`; Segment 3 type `patch` label `PATCH-MMR2-001`. Assign ports for each segment. |
| 5 | `ops_technician` | Work order | Start, complete all tasks, mark all 3 segments installed. |
| 6 | `ops_manager` | `/services/[id]` | Activate cable path. Complete work order. |
| 7 | `customer_viewer` | `/portal/services/[id]` | View 3 segments with cable labels in service detail. |

**Expected Result:** Service `active` with a 3-segment primary cable path. 6 ports total in `in_use`.

---

## Scenario 6 — Primary + Diverse Path (Redundant Service)

**Business Context:** A fintech customer requires full redundancy with geographically separated primary and diverse paths.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Submit order. Notes: "Requires diverse path for regulatory compliance." |
| 2 | `ops_manager` | `/orders/[id]` | Review → Feasibility → Approve. |
| 3 | `ops_manager` | `/services/[id]` | Plan **Primary** cable path (Role: Primary) through Rack A. |
| 4 | `ops_manager` | `/services/[id]` | Plan **Diverse** cable path (Role: Diverse) through a different rack/room. |
| 5 | `ops_technician` | Work orders | Complete and mark both paths installed. |
| 6 | `ops_manager` | `/services/[id]` | Activate both cable paths. Complete work order. |
| 7 | `customer_viewer` | `/portal/services/[id]` | Verify both Primary and Diverse paths shown as `active`. |

**Expected Result:** Service `active` with 2 cable paths (Primary + Diverse), all ports `in_use`.

---

## Scenario 7 — Customer Viewer Cannot Submit Orders

**Business Context:** Verify read-only role enforcement. A new team member has been given `customer_viewer` access by mistake.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_viewer` | `/portal` | Log in. Verify that the "Request New Cross-Connect" button is absent from the dashboard. |
| 2 | `customer_viewer` | `/portal/orders/new` | Navigate directly to the URL. Verify redirect or access-denied. |
| 3 | `customer_viewer` | `/portal/orders` | View existing orders — list is visible. |
| 4 | `customer_admin` | `/portal/team/[userId]` | Upgrade `customer_viewer` to `customer_orderer` role. |
| 5 | `customer_orderer` | `/portal/orders/new` | Now successfully create a draft order. |

**Expected Result:** `customer_viewer` cannot reach the new order form. Role upgrade is reflected immediately.

---

## Scenario 8 — Service Disconnect Request

**Business Context:** A tenant is vacating their cage at end of contract and requests disconnection of their cross-connect.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/services/[id]` | Click **Request Disconnect** on an `active` service. |
| 2 | `ops_manager` | `/services/[id]` | See service in `pending_disconnect` state. |
| 3 | `ops_manager` | `/work-orders` | A disconnect work order should exist. Assign it to a technician. |
| 4 | `ops_technician` | Work order | Start work, complete tasks (physically remove patch cords). |
| 5 | `ops_manager` | `/services/[id]` | Decommission the cable path (active → decommissioned). Ports released to `available`. |
| 6 | `ops_manager` | `/work-orders/[id]` | Complete the work order. Service transitions to `disconnected`. |
| 7 | `customer_viewer` | `/portal/services/[id]` | Service shows `disconnected`. |

**Expected Result:** Service `disconnected`, cable path `decommissioned`, all ports back to `available`. Billing event `service_disconnected` emitted.

---

## Scenario 9 — Suspend and Resume Service

**Business Context:** A customer temporarily suspends operations at their cage for emergency maintenance.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `ops_manager` | `/services/[id]` | Click **Suspend** on an `active` service. Service → `suspended`. |
| 2 | `customer_viewer` | `/portal/services/[id]` | Verify service shows `suspended`. |
| 3 | `ops_manager` | `/services/[id]` | After maintenance completes, click **Resume**. Service → `active`. |
| 4 | `customer_orderer` | `/portal/services/[id]` | Verify service is `active` again. |

**Expected Result:** Service transitions suspended → active without any port state change.

---

## Scenario 10 — Approval Deferred, Then Approved

**Business Context:** Ops manager needs to defer an approval decision pending legal review of a new customer's contract.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | Portal | Submit order. |
| 2 | `ops_manager` | `/orders/[id]` | Begin review → confirm feasibility (→ pending_approval). |
| 3 | `ops_manager` | Approvals queue `/approvals/queue` | Open the approval request. Record decision: **Deferred**. Reason: "Awaiting signed MSA from legal." |
| 4 | `ops_manager` | Same approval | Two days later, record decision: **Approved**. |
| 5 | `customer_orderer` | `/portal/orders/[id]` | Order shows `approved`. |

**Expected Result:** ApprovalRequest shows deferred → approved decision history. Service record created on final approval.

---

## Scenario 11 — Technician Fails Test, Remediation, Retest

**Business Context:** A newly installed patch cord has a bad termination and fails continuity testing.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `ops_manager` | Normal flow | Order approved, cable path planned, work order assigned. |
| 2 | `ops_technician` | Work order | Start work, complete physical installation, submit for testing (→ `pending_test`). |
| 3 | `ops_manager` | `/work-orders/[id]` | Click **Fail Test**. Notes: "Segment 1 insertion loss exceeds 1dB. Re-terminate." Work order → `test_failed`. |
| 4 | `ops_technician` | Work order | Re-terminate patch cord. Click **Start Work** again to move back to `in_progress`. |
| 5 | `ops_technician` | Work order | Submit for testing again (→ `pending_test`). Upload test result PDF via Documents. |
| 6 | `ops_manager` | `/work-orders/[id]` | Click **Complete**. |

**Expected Result:** Audit log shows the full test_failed → in_progress → pending_test → completed cycle.

---

## Scenario 12 — Upload LOA/CFA Documents

**Business Context:** A carrier-side cross-connect requires a Letter of Authorization (LOA) from the customer and a CFA from the carrier before ops can approve.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/[id]` | Upload LOA PDF (≤50 MB). |
| 2 | `ops_manager` | `/orders/[id]` | View the uploaded document. Click download link to verify content. |
| 3 | `ops_manager` | `/orders/[id]` | Upload CFA document received from the carrier. |
| 4 | `ops_manager` | `/orders/[id]` | Proceed: Review → Feasibility → Approve. |

**Expected Result:** Both documents are listed under the order. Download URLs are pre-signed and expire after 1 hour.

---

## Scenario 13 — Abort Provisioning Before Field Work

**Business Context:** After order approval, the customer asks to cancel before any physical work has started.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | Normal flow | — | Order approved. Service is `provisioning`. Work order created but not yet assigned. |
| 2 | `customer_orderer` | `/portal/services/[id]` | Cannot abort directly — contacts ops. |
| 3 | `ops_manager` | `/services/[id]` | Click **Abort Provisioning**. Service → `disconnected`. Work order cancelled. |
| 4 | `customer_viewer` | `/portal/services/[id]` | Service shows `disconnected`. No billing event emitted. |

**Expected Result:** Service aborted cleanly with no port reservations created (path was never planned).

---

## Scenario 14 — Cable Path Decommissioned and Replanned (Reroute)

**Business Context:** A patch panel is being migrated to a new rack. The active cable path must be decommissioned and replanned on the new panel ports.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `ops_manager` | `/services/[id]` | Identify active cable path. Click **Decommission**. Path → `decommissioned`. Ports released. |
| 2 | `ops_manager` | `/services/[id]` | Plan a new cable path using the new panel's port. Role: Primary. |
| 3 | `ops_technician` | Work order | Install new patch cord, mark path installed. |
| 4 | `ops_manager` | `/services/[id]` | Activate new cable path. Service remains `active` throughout. |

**Expected Result:** Old path `decommissioned`, new path `active`. Old ports `available`, new ports `in_use`.

---

## Scenario 15 — New Customer Organisation and First Order

**Business Context:** Onboarding a brand-new customer company to the platform end-to-end.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `super_admin` | `/organizations` | Create new organisation. Name: "Acme Trading Pte Ltd". |
| 2 | `super_admin` | `/organizations/[id]/users` | Create `customer_admin` user for Acme. Email: `admin@acme.com`. |
| 3 | `customer_admin` | `/portal/team/new` | Log in as `admin@acme.com`. Invite `customer_orderer`: `ops@acme.com`. |
| 4 | `customer_orderer` | `/portal/orders/new` | Log in as `ops@acme.com`. Submit first cross-connect order. |
| 5 | `ops_manager` | `/orders/[id]` | Review, approve the order. |

**Expected Result:** New org appears in organisation list. First order processed successfully.

---

## Scenario 16 — Inventory Check Before Ordering

**Business Context:** Customer's admin wants to verify port availability before committing to an order.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_admin` | — | Contacts ops to check availability. |
| 2 | `ops_manager` | `/inventory` | Select site. View port availability summary by room. Identify room with free SMF ports. |
| 3 | `ops_manager` | `/inventory` | Select room, then specific panel. Verify available ports with correct media type (`SMF`) and connector (`LC`). |
| 4 | `customer_admin` | Portal | Customer submits order specifying the confirmed panel/port. |

**Expected Result:** Inventory page shows correct available port count per room and panel.

---

## Scenario 17 — Billing Event Export Verification

**Business Context:** Finance team polls for billing signals after a batch of services are activated.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | Normal flow | — | Complete Scenario 1 (service activated). |
| 2 | `ops_manager` | `/services/[id]` | Check billing events tab on service detail. Verify `service_activated` event is present with correct MRC/NRC amounts. |
| 3 | `super_admin` | API (or `/billing-events/pending`) | Retrieve pending billing events. Mark them as exported. |
| 4 | `super_admin` | Billing events | Verify events no longer appear in pending list after marking exported. |

**Expected Result:** `service_activated` billing event emitted on service activation. Mark-exported idempotent.

---

## Scenario 18 — Ops Technician Cannot Approve Orders (Role Boundary)

**Business Context:** Verify that technicians are properly restricted from performing manager-level actions.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `ops_technician` | `/orders` | Log in as technician. Order list is visible (read-only). |
| 2 | `ops_technician` | `/orders/[id]` | No **Approve**, **Reject**, or **Begin Review** buttons visible. |
| 3 | `ops_technician` | `/work-orders/[id]` | Assigned work order shows **Start Work**, **Submit for Testing** buttons — these work. |
| 4 | `ops_technician` | `/services/[id]` | **Mark Installed** is available. **Activate** cable path is NOT available. |

**Expected Result:** `ops_technician` can only progress work orders and mark installations. Approval and activation require `ops_manager` or higher.

---

## Scenario 19 — Temporary Service with Expiry Extension

**Business Context:** A media company books a temporary cross-connect for a 2-week live broadcast event, then extends it.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | `customer_orderer` | `/portal/orders/new` | Submit order. Notes: "Temporary service for live broadcast 1–15 April 2026." |
| 2 | `ops_manager` | Normal flow | Approve, plan path, install, activate service. |
| 3 | `customer_orderer` | 7 days later — `/portal/services/[id]` | Event extended to 22 April. Contact ops to extend. |
| 4 | `ops_manager` | `/services/[id]` | Click **Extend Service**. New expiry: 22 April 2026. |
| 5 | `customer_viewer` | `/portal/services/[id]` | Updated expiry date visible on service detail. |
| 6 | `ops_manager` | On expiry — `/services/[id]` | Service disconnect process begins (see Scenario 8). |

**Expected Result:** `service_expiry_extended` billing event emitted. New expiry date saved.

---

## Scenario 20 — Full Audit Trail Review

**Business Context:** Compliance review requires a full audittrail for a specific order from request to activation.

| # | Actor | Where | Action |
|---|-------|-------|--------|
| 1 | Complete Scenario 1 first | — | Ensure a full happy-path order exists. |
| 2 | `super_admin` | `/audit` | Open the audit log. Filter by entity type: `CrossConnectOrder`. |
| 3 | `super_admin` | Audit for order | Verify events in sequence: `order.draft_created` → `order.submitted` → `order.review_started` → `order.feasibility_passed` → `order.approval_requested` → `order.approved`. |
| 4 | `super_admin` | Audit for service | Verify: `service.created` → `service.activated`. |
| 5 | `super_admin` | Audit for cable path | Verify: `cable_path.planned` → `cable_path.installed` → `cable_path.activated`. |
| 6 | `super_admin` | Audit for ports | Verify: `port.reserved` (on plan) → `port.activated` (on cable path activate). |
| 7 | `super_admin` | Audit filters | Filter by actor (ops manager's email). All their actions appear. Filter by date range. Download/copy audit JSON for compliance report. |

**Expected Result:** Complete, immutable chain of custody from order creation through activation, with actor identities, timestamps, and diffs on each event.

---

## Notes for Testers

- **Seed data setup:** Use `pnpm --filter @xc/db seed` to populate test sites, buildings, rooms, cages, racks, panels, and ports before running these scenarios.
- **Role switching:** Create one user per role in the same or different organisations to avoid permission bleed.
- **Port exhaustion:** For scenarios testing rejection (Scenario 2), manually set all panel ports to `reserved` or `in_use` via the inventory port-state API or seed script before the test.
- **Documents:** Any PDF/PNG under 50 MB works for LOA/CFA upload tests.
- **Billing amounts:** NRC/MRC values are set in the order; verify they appear verbatim in billing events.
