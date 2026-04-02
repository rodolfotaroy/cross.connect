# CrossConnect — Japanese Localization String Inventory

**Date:** 2026-03-27  
**Scope:** Full UI + API error surface  
**Target locale:** ja-JP  
**Status:** Extraction only — no translations yet

---

## 1. Summary

| Metric                                 | Count |
| -------------------------------------- | ----- |
| Estimated translatable strings         | ~720  |
| Unique canonical strings (after dedup) | ~580  |
| Modules scanned                        | 16    |
| Files with user-facing text            | 38    |

### Major modules scanned

Auth · Shared Layout/Navigation · Dashboard · Orders · Approvals · Services · Work Orders · Organizations · Inventory · Locations · Billing Events · Audit Log · Customer Portal · Customer Orders · Customer Services · Customer Team

### Key localization risks found

1. **Enum leakage via `.replace(/_/g, ' ')`** — All status badges, service/work-order types, and the sidebar role display render raw enum values with underscores swapped for spaces (e.g. `pending_approval` → `"pending approval"`). These will never be translated unless enum display is extracted into a lookup map.
2. **Hardcoded English pluralization** — `order${total !== 1 ? 's' : ''}`, `export${n !== 1 ? 's' : ''}`, `member${n !== 1 ? 's' : ''}` — Japanese does not pluralize; the pattern needs restructuring.
3. **USD currency format** — `$${(cents / 100).toFixed(2)}` in billing events; requires locale-aware `Intl.NumberFormat`.
4. **Inline fallback reasons** — API calls include hardcoded English fallback strings (`'Suspended by operator'`, `'Disconnect requested'`, `'Provisioning aborted'`) that are sent server-side and may surface in audit trails.
5. **`Organisation` vs `Organization` inconsistency** — Edit form uses "Organisation Name" (British) while all other forms use "Organization Name" (American). Japanese translation must pick one.
6. **Concatenated dynamic banners** — Approval/provisioning banners on the customer order detail page combine fixed text + JSX children (service number, state) mid-sentence. Japanese requires full sentence rewrites, not substring substitution.
7. **Audit event `action` strings rendered raw** — `evt.action` (e.g. `workorder.created`, `service.disconnect_requested`) is shown directly in the Audit Log UI without a display-name mapping.
8. **Technical jargon requiring glossary** — "A-Side / Z-Side", "LOA / CFA / Demarc", "cable path / segment", "MMR", "DAC", "SMF/MMF", "cross-connect" have no standard Japanese equivalents and require glossary decisions before translation begins.
9. **Role labels partially mapped** — `ROLE_LABEL` map only covers the three customer roles; operator roles fall through to `.replace(/_/g, ' ')`.
10. **Date/time rendering** — `toLocaleString()` / `toLocaleDateString()` called without a forced locale, so output format may change with the user's browser locale rather than being consistently Japanese.

---

## 2. Domain Glossary Candidates

| Term                        | Example source text                                               | Module          | Why it needs glossary control                         | Notes                                      |
| --------------------------- | ----------------------------------------------------------------- | --------------- | ----------------------------------------------------- | ------------------------------------------ |
| Cross-Connect               | "CrossConnect", "Request Cross-Connect", "cross-connect orders"   | All             | Core product name — may stay English or need katakana | クロスコネクト is common in DC industry    |
| Cross-Connect Order         | "Cross-Connect Orders", "My Cross-Connect Requests"               | Orders          | Entity name used across both portals                  | Consider 相互接続注文 or keep English      |
| Cross-Connect Service       | "Cross-Connect Service", "Active Services"                        | Services        | Distinct from Order; needs differentiation            |                                            |
| Work Order                  | "Work Orders", "WO #"                                             | Work Orders     | Industry-standard term                                | ワークオーダー or 作業指示書               |
| A-Side / Z-Side             | "A-Side (Your Equipment)", "Z-Side (Remote / Carrier)"            | Orders/Services | Telecom standard; should keep A/Z notation            | A面 / Z面 possible                         |
| LOA                         | "LOA Number"                                                      | New Order form  | Letter of Authorization — telecom abbreviation        | LOA番号 or 認可状番号                      |
| CFA                         | "CFA Number"                                                      | New Order form  | Connecting Facility Assignment                        | CFA番号                                    |
| Demarc / Demarc Description | "Demarc Description", "Demarc:", "Demarc Point"                   | Orders/Services | Demarcation point — technical telecom term            | 分界点 is the standard Japanese equivalent |
| SMF                         | "SMF (Single-Mode Fibre)"                                         | New Order       | Media type                                            | シングルモードファイバー (略称 SMF)        |
| MMF                         | "MMF (Multi-Mode Fibre)"                                          | New Order       | Media type                                            | マルチモードファイバー (略称 MMF)          |
| DAC                         | "DAC (Direct Attach Copper)"                                      | New Order       | Media type                                            | ダイレクトアタッチ銅ケーブル (略称 DAC)    |
| MMR                         | "MMR" (room type in inventory)                                    | Inventory       | Meet-Me Room — DC-specific term                       | ミートミールーム                           |
| Cable Path                  | "Cable Paths", "No cable paths planned yet"                       | Services        | Physical routing path                                 | ケーブルパス or ケーブル経路               |
| Path Segment                | "From Port / To Port", "#, From Port, To Port, Type, Cable Label" | Services        | Sub-unit of a cable path                              | セグメント                                 |
| Port                        | "Port label", "No ports provisioned", "Available ports"           | Inventory       | Physical port on a panel                              | ポート                                     |
| Panel                       | "Panel", "panel type", "patch_panel", "from panel"                | Inventory       | Patch panel or distribution frame                     | パネル / 配線盤                            |
| Feasibility Review          | "Start Feasibility Review", "Feasibility review started"          | Orders          | Key workflow state name                               | 実現可能性審査                             |
| Approval Queue              | "Work Queue", "Approvals Queue"                                   | Approvals/Nav   | Two different terms for the same concept              | Unify to one Japanese term                 |
| Billing Event               | "Billing Events", "MRC", "NRC"                                    | Billing         | Financial trigger events                              | 課金イベント; MRC=月額料金, NRC=初期費用   |
| MRC                         | "MRC" column header in billing                                    | Billing         | Monthly Recurring Charge                              | 月額料金 (MRC)                             |
| NRC                         | "NRC" column header in billing                                    | Billing         | Non-Recurring Charge                                  | 初期費用 (NRC)                             |
| Audit Trail                 | "Audit Trail", "Audit Log"                                        | Orders/WO/Audit | Two names used                                        | 監査証跡 / 操作ログ — pick one             |
| Temporary cross-connect     | "Temporary", "Yes — temporary", "Temp" badge                      | Orders/Services | Short-term service type                               | 一時的クロスコネクト                       |
| Strand Role                 | "Strand" column in inventory                                      | Inventory       | TX/RX strand designation                              | ストランドロール                           |

---

## 3. Role Labels

| Source value       | Display text found                                                                  | Location                                                   | Notes                                                 |
| ------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `super_admin`      | "super admin" (via `.replace(/_/g, ' ')`)                                           | Sidebar userLine2, operator org users table                | No official display label — only fallback exists      |
| `ops_manager`      | "ops manager" (via `.replace(/_/g, ' ')`)                                           | Sidebar, org users table                                   | No official display label                             |
| `ops_technician`   | "ops technician" (via `.replace(/_/g, ' ')`)                                        | Sidebar, org users table, add-user-form ("Ops Technician") | add-user-form.tsx has proper display; sidebar doesn't |
| `customer_admin`   | "Admin" (ROLE_LABEL), "Admin — full team management access", "Customer Admin"       | team page, invite-form, add-user-form                      | Three different display strings; consolidate          |
| `customer_orderer` | "Orderer" (ROLE_LABEL), "Orderer — can place and cancel orders", "Customer Orderer" | team page, invite-form, add-user-form                      | Three different display strings                       |
| `customer_viewer`  | "Viewer" (ROLE_LABEL), "Viewer — read-only access", "Customer Viewer"               | team page, invite-form, add-user-form                      | Three different display strings                       |

**Risk:** `ROLE_LABEL` only maps the three customer roles. All operator roles are exposed as raw snake_case converted to lowercase words in the sidebar footer and org user tables.

---

## 4. State / Status Labels

### 4a. Order States

| Entity | Source value       | Display text found                      | Location                | Notes                               |
| ------ | ------------------ | --------------------------------------- | ----------------------- | ----------------------------------- |
| Order  | `draft`            | "draft" / "Draft"                       | Badge, filter options   | Inconsistent casing                 |
| Order  | `submitted`        | "submitted" / "Submitted"               | Badge, filter           |                                     |
| Order  | `under_review`     | "under review" / "Under Review"         | Badge, filter           | Via `.replace(/_/g, ' ')` for badge |
| Order  | `pending_approval` | "pending approval" / "Pending Approval" | Badge, filter           | Via `.replace(/_/g, ' ')` for badge |
| Order  | `approved`         | "approved" / "Approved"                 | Badge, filter, timeline |                                     |
| Order  | `rejected`         | "rejected" / "Rejected"                 | Badge, filter, timeline |                                     |
| Order  | `cancelled`        | "cancelled" / "Cancelled"               | Badge, filter, timeline |                                     |

### 4b. Service States

| Entity  | Source value         | Display text found                          | Location              | Notes                                 |
| ------- | -------------------- | ------------------------------------------- | --------------------- | ------------------------------------- |
| Service | `provisioning`       | "provisioning" / "Provisioning"             | Badge, filter         |                                       |
| Service | `active`             | "active" / "Active"                         | Badge, filter, banner |                                       |
| Service | `suspended`          | "suspended" / "Suspended"                   | Badge, filter         |                                       |
| Service | `pending_disconnect` | "pending disconnect" / "Pending Disconnect" | Badge, filter         | No capitalisation in badge (raw enum) |
| Service | `disconnected`       | "disconnected" / "Disconnected"             | Badge, filter, notice |                                       |

### 4c. Work Order States

| Entity     | Source value   | Display text found              | Location      | Notes                               |
| ---------- | -------------- | ------------------------------- | ------------- | ----------------------------------- |
| Work Order | `created`      | "created" / "Created"           | Badge, filter |                                     |
| Work Order | `assigned`     | "assigned" / "Assigned"         | Badge, filter |                                     |
| Work Order | `in_progress`  | "in progress" / "In Progress"   | Badge, filter | Via `.replace(/_/g, ' ')` for badge |
| Work Order | `pending_test` | "pending test" / "Pending Test" | Badge, filter | Via `.replace(/_/g, ' ')` for badge |
| Work Order | `completed`    | "completed" / "Completed"       | Badge, filter |                                     |
| Work Order | `cancelled`    | "cancelled" / "Cancelled"       | Badge, filter |                                     |

### 4d. Port States

| Entity | Source value     | Display text found | Location               | Notes                     |
| ------ | ---------------- | ------------------ | ---------------------- | ------------------------- |
| Port   | `available`      | "available"        | Badge (via `.replace`) |                           |
| Port   | `reserved`       | "reserved"         | Badge                  |                           |
| Port   | `in_use`         | "in use"           | Badge                  | Via `.replace(/_/g, ' ')` |
| Port   | `faulty`         | "faulty"           | Badge                  |                           |
| Port   | `maintenance`    | "maintenance"      | Badge                  |                           |
| Port   | `decommissioned` | "decommissioned"   | Badge                  |                           |

### 4e. Cable Path States

| Entity     | Source value     | Display text found | Location    | Notes                                                          |
| ---------- | ---------------- | ------------------ | ----------- | -------------------------------------------------------------- |
| Cable Path | `planned`        | "planned"          | Badge (raw) | Directly rendered in cable-path-management.tsx — no `.replace` |
| Cable Path | `installed`      | "installed"        | Badge (raw) |                                                                |
| Cable Path | `active`         | "active"           | Badge (raw) |                                                                |
| Cable Path | `rerouting`      | "rerouting"        | Badge (raw) |                                                                |
| Cable Path | `decommissioned` | "decommissioned"   | Badge (raw) |                                                                |

### 4f. Organization Status

| Entity       | Source value      | Display text found | Location | Notes |
| ------------ | ----------------- | ------------------ | -------- | ----- |
| Organization | `isActive: true`  | "Active"           | Badge    |       |
| Organization | `isActive: false` | "Inactive"         | Badge    |       |

### 4g. Billing Event Types

| Entity        | Source value           | Display text found     | Location               | Notes |
| ------------- | ---------------------- | ---------------------- | ---------------------- | ----- |
| Billing Event | `service_activated`    | "service activated"    | Badge (via `.replace`) |       |
| Billing Event | `service_disconnected` | "service disconnected" | Badge (via `.replace`) |       |
| Billing Event | `temporary_extended`   | "temporary extended"   | Badge (via `.replace`) |       |
| Billing Event | `reroute_completed`    | "reroute completed"    | Badge (via `.replace`) |       |

---

## 5. Action Labels

| Action                       | Source text                                              | Module/Page                | UI type                        | Notes                                                    |
| ---------------------------- | -------------------------------------------------------- | -------------------------- | ------------------------------ | -------------------------------------------------------- |
| Sign in                      | "Sign in", "Signing in…"                                 | Login                      | Button                         | "…" = ellipsis loading state                             |
| Sign out                     | "Sign out"                                               | Sidebar footer             | Button                         |                                                          |
| Submit order                 | "Submit for Review"                                      | Order detail (operator)    | Button                         |                                                          |
| Start review                 | "Start Feasibility Review"                               | Order detail (operator)    | Button                         |                                                          |
| Confirm feasibility          | "Confirm Feasibility", "Confirm & Send to Approval"      | Order actions              | Button                         | Two strings for same action                              |
| Approve order                | "Approve", "Confirm Approval"                            | Order actions              | Button                         |                                                          |
| Reject order                 | "Reject", "Confirm Rejection"                            | Order actions              | Button                         |                                                          |
| Cancel order                 | "Cancel", "Confirm Cancellation"                         | Order actions              | Button                         |                                                          |
| Create work order            | "Create Work Order", "Creating…", "Create"               | Order detail / WO form     | Button                         | Three variants                                           |
| Assign work order            | "Assign", "Reassign", "Confirm Assignment"               | WO actions                 | Button                         |                                                          |
| Start work                   | "Start Work"                                             | WO actions                 | Button                         |                                                          |
| Mark ready for test          | "Mark Ready for Test"                                    | WO actions                 | Button                         |                                                          |
| Test failed                  | "Test Failed", "Report Test Failure"                     | WO actions                 | Button / panel title           | Two strings                                              |
| Complete WO                  | "Complete", "Complete Work Order"                        | WO actions                 | Button / panel title           |                                                          |
| Cancel WO                    | "Cancel", "Cancel Work Order"                            | WO actions                 | Button / panel title           |                                                          |
| Suspend service              | "Suspend", "Suspend Service"                             | Service actions            | Button / panel title           |                                                          |
| Resume service               | "Resume Service"                                         | Service actions            | Button                         |                                                          |
| Request disconnect           | "Request Disconnect", "Request Disconnection"            | Service actions            | Button / panel title           | Two different strings                                    |
| Abort provisioning           | "Abort Provisioning", "Abort"                            | Service actions            | Button / panel title           |                                                          |
| Extend expiry                | "Extend Expiry", "Extend Service Expiry", "Extend"       | Service actions            | Button / panel title / confirm | Three strings                                            |
| Mark Installed               | "Mark Installed"                                         | Cable path management      | Button                         |                                                          |
| Activate (path)              | "Activate"                                               | Cable path management      | Button                         | Same label as service activation; context differs        |
| Decommission (path)          | "Decommission"                                           | Cable path management      | Button                         |                                                          |
| New organization             | "+ New Organization", "Create Organization", "Saving..." | Orgs                       | Button                         |                                                          |
| Edit organization            | "Edit", "Save Changes", "Saving…"                        | Org edit                   | Button                         |                                                          |
| Deactivate org               | "Deactivate", "Deactivating…", "Confirm"                 | Org deactivate             | Button                         |                                                          |
| Deactivate user (operator)   | "Deactivate", "Deactivating…", "Confirm"                 | Org user table             | Button                         | Same text as org deactivate                              |
| Add user (operator)          | "+ Add user", "Create User", "Creating…"                 | Org detail / add-user      | Button/link                    |                                                          |
| New order (operator)         | "New Order", "Create Draft Order", "Creating…"           | Orders                     | Button                         |                                                          |
| Invite member (customer)     | "+ Invite Member", "Create Member", "Creating…"          | Team                       | Button                         |                                                          |
| Remove access (customer)     | "Remove access", "Removing…", "Confirm"                  | Team table                 | Button                         |                                                          |
| Deactivate member (customer) | "Deactivate Member"                                      | Team user detail           | Button                         |                                                          |
| Reactivate member (customer) | "Reactivate Member"                                      | Team user detail           | Button                         |                                                          |
| New site                     | "+ New Site"                                             | Locations                  | Button/link                    |                                                          |
| Filter / Search              | "Search", "Filter", "Clear"                              | Multiple pages             | Button/link                    |                                                          |
| View all                     | "View all"                                               | Dashboard                  | Link                           |                                                          |
| View                         | "View"                                                   | Work order list            | Link                           |                                                          |
| Back                         | "Back"                                                   | Action panels              | Button                         |                                                          |
| Cancel (generic)             | "Cancel"                                                 | Multiple forms/panels      | Button                         | Same across many screens — Japanese should match         |
| Confirm (generic)            | "Confirm"                                                | Multiple action panels     | Button                         |                                                          |
| Try again                    | "Try again"                                              | Error pages                | Button                         |                                                          |
| Previous / Next              | "← Prev", "Next", "Previous", "Next"                     | Pagination                 | Link                           | Inconsistent: some pages use "← Prev", others "Previous" |
| Request New                  | "Request New"                                            | Customer orders            | Button                         |                                                          |
| Request Cross-Connect        | "Request Cross-Connect"                                  | Customer portal home / nav | Button/nav item                |                                                          |

---

## 6. Module-by-Module String Inventory

### 6.1 Auth

| Suggested Key              | English Text                | Module/Page | Route    | UI Type                | File/Component   | Context/Notes                                    | Risk   |
| -------------------------- | --------------------------- | ----------- | -------- | ---------------------- | ---------------- | ------------------------------------------------ | ------ |
| `auth.app_name`            | "CrossConnect"              | Login       | `/login` | Heading h1             | `login/page.tsx` | Product name — may stay as-is                    | low    |
| `auth.tagline`             | "Sign in to your account"   | Login       | `/login` | Subtitle               | `login/page.tsx` |                                                  | low    |
| `auth.email_label`         | "Email"                     | Login       | `/login` | Form label             | `login-form.tsx` |                                                  | low    |
| `auth.password_label`      | "Password"                  | Login       | `/login` | Form label             | `login-form.tsx` |                                                  | low    |
| `auth.submit`              | "Sign in"                   | Login       | `/login` | Button                 | `login-form.tsx` |                                                  | low    |
| `auth.signing_in`          | "Signing in…"               | Login       | `/login` | Button (loading state) | `login-form.tsx` | Loading state variant                            | low    |
| `auth.invalid_credentials` | "Invalid email or password" | Login       | `/login` | Error message          | `login-form.tsx` | Security-neutral wording — intentional vagueness | medium |

**Note:** The page `<title>` is "Login" (from `metadata.title`). Japanese: "ログイン"

---

### 6.2 Shared Layout / Navigation

#### Operator sidebar nav items

| Suggested Key            | English Text      | File                    | Notes                                                        |
| ------------------------ | ----------------- | ----------------------- | ------------------------------------------------------------ |
| `nav.op.dashboard`       | "Dashboard"       | `(operator)/layout.tsx` |                                                              |
| `nav.op.orders`          | "Orders"          | `(operator)/layout.tsx` |                                                              |
| `nav.op.approvals`       | "Approvals Queue" | `(operator)/layout.tsx` | Note: approvals page title says "Work Queue" — inconsistency |
| `nav.op.work_orders`     | "Work Orders"     | `(operator)/layout.tsx` |                                                              |
| `nav.op.services`        | "Services"        | `(operator)/layout.tsx` |                                                              |
| `nav.op.inventory`       | "Inventory"       | `(operator)/layout.tsx` |                                                              |
| `nav.op.locations`       | "Locations"       | `(operator)/layout.tsx` |                                                              |
| `nav.op.organizations`   | "Organizations"   | `(operator)/layout.tsx` |                                                              |
| `nav.op.billing`         | "Billing Events"  | `(operator)/layout.tsx` |                                                              |
| `nav.op.audit`           | "Audit Log"       | `(operator)/layout.tsx` |                                                              |
| `nav.op.portal_subtitle` | "Operator Portal" | `(operator)/layout.tsx` | Sidebar subtitle string                                      |

#### Customer sidebar nav items

| Suggested Key              | English Text            | File                    | Notes                             |
| -------------------------- | ----------------------- | ----------------------- | --------------------------------- |
| `nav.cust.orders`          | "My Orders"             | `(customer)/layout.tsx` |                                   |
| `nav.cust.new_order`       | "Request Cross-Connect" | `(customer)/layout.tsx` | Shown only to admin/orderer roles |
| `nav.cust.services`        | "Active Services"       | `(customer)/layout.tsx` |                                   |
| `nav.cust.team`            | "My Team"               | `(customer)/layout.tsx` | Shown only to admin role          |
| `nav.cust.portal_subtitle` | "Customer Portal"       | `(customer)/layout.tsx` | Sidebar subtitle                  |

#### Sidebar UI controls

| Suggested Key            | English Text       | UI Type            | Notes                                                           |
| ------------------------ | ------------------ | ------------------ | --------------------------------------------------------------- |
| `sidebar.sign_out`       | "Sign out"         | Button             | `collapsible-sidebar.tsx` — visible in full and icon-only modes |
| `sidebar.close_menu`     | "Close menu"       | aria-label / title | Mobile drawer X button                                          |
| `sidebar.open_menu`      | "Open menu"        | aria-label / title | Mobile hamburger button                                         |
| `sidebar.expand`         | "Expand sidebar"   | aria-label / title | Desktop collapse toggle                                         |
| `sidebar.collapse`       | "Collapse sidebar" | aria-label / title | Desktop collapse toggle                                         |
| `sidebar.backdrop_close` | "Close menu"       | aria-label         | Mobile backdrop overlay                                         |

---

### 6.3 Shared Components

| Suggested Key                   | English Text                                      | Component                                  | UI Type           | Notes                                   |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------ | ----------------- | --------------------------------------- |
| `shared.error.heading`          | "Something went wrong"                            | `error.tsx` (both portals)                 | Error heading     | Both portals have identical error pages |
| `shared.error.default_message`  | "An unexpected error occurred. Please try again." | `error.tsx`                                | Error body        | Fallback when `error.message` is empty  |
| `shared.error.ref`              | "Ref: {digest}"                                   | `error.tsx`                                | Error footnote    | Dynamic; digest is a hash string        |
| `shared.error.retry`            | "Try again"                                       | `error.tsx`                                | Button            |                                         |
| `shared.pagination.prev`        | "← Prev"                                          | Multiple pages                             | Link              | Customer portal uses "← Prev"           |
| `shared.pagination.prev_alt`    | "Previous"                                        | `organizations/page.tsx`, `audit/page.tsx` | Link              | Inconsistent form of "Prev" — pick one  |
| `shared.pagination.next`        | "Next"                                            | Multiple pages                             | Link              |                                         |
| `shared.pagination.showing`     | "Showing {from}–{to} of {total}"                  | Organizations, Audit                       | Body text         | Uses en-dash; dynamic interpolation     |
| `shared.empty_state.no_results` | (varies per page — see individual sections)       | `EmptyState` component                     | Empty state title | Title is always passed as prop          |
| `shared.detail.missing_value`   | "—"                                               | `DetailRow`                                | Fallback value    | Em dash for null values                 |
| `shared.badge.temp`             | "Temp"                                            | `ServiceStateBadge` companion              | Badge             | Short form used in services list        |
| `shared.badge.yes_temporary`    | "Yes — temporary"                                 | Order detail                               | Badge             | `Badge label="Yes — temporary"`         |
| `shared.badge.active`           | "Active"                                          | Orgs, Users                                | Badge             |                                         |
| `shared.badge.inactive`         | "Inactive"                                        | Orgs, Users                                | Badge             |                                         |

---

### 6.4 Dashboard (Operator)

Route: `/dashboard`

| Suggested Key                         | English Text        | UI Type         | Notes                                             |
| ------------------------------------- | ------------------- | --------------- | ------------------------------------------------- |
| `dashboard.title`                     | "Dashboard"         | Page heading    | Also `<title>` metadata                           |
| `dashboard.kpi.pending_approvals`     | "Pending Approvals" | KPI card label  |                                                   |
| `dashboard.kpi.active_services`       | "Active Services"   | KPI card label  |                                                   |
| `dashboard.kpi.open_work_orders`      | "Open Work Orders"  | KPI card label  |                                                   |
| `dashboard.kpi.total_orders`          | "Total Orders"      | KPI card label  |                                                   |
| `dashboard.recent_approvals.heading`  | "Pending Approvals" | Section heading | Duplicates KPI label — consider one canonical key |
| `dashboard.recent_approvals.view_all` | "View all"          | Link            |                                                   |
| `dashboard.table.order_num`           | "Order #"           | Table header    |                                                   |
| `dashboard.table.customer`            | "Customer"          | Table header    |                                                   |
| `dashboard.table.type`                | "Type"              | Table header    |                                                   |
| `dashboard.table.submitted`           | "Submitted"         | Table header    |                                                   |

---

### 6.5 Orders (Operator)

Route: `/orders`, `/orders/new`, `/orders/[id]`

#### Orders list

| Suggested Key                    | English Text                     | UI Type           | Notes                                     |
| -------------------------------- | -------------------------------- | ----------------- | ----------------------------------------- |
| `orders.title`                   | "Cross-Connect Orders"           | Page heading      |                                           |
| `orders.new_button`              | "New Order"                      | Button            |                                           |
| `orders.search_placeholder`      | "Search order number…"           | Input placeholder |                                           |
| `orders.filter.state_label`      | "Filter by state"                | SR-only label     |                                           |
| `orders.filter.all_states`       | "All states"                     | Select option     |                                           |
| `orders.filter.draft`            | "Draft"                          | Select option     |                                           |
| `orders.filter.submitted`        | "Submitted"                      | Select option     |                                           |
| `orders.filter.under_review`     | "Under Review"                   | Select option     |                                           |
| `orders.filter.pending_approval` | "Pending Approval"               | Select option     |                                           |
| `orders.filter.approved`         | "Approved"                       | Select option     |                                           |
| `orders.filter.rejected`         | "Rejected"                       | Select option     |                                           |
| `orders.filter.cancelled`        | "Cancelled"                      | Select option     |                                           |
| `orders.filter.search_button`    | "Search"                         | Button            |                                           |
| `orders.filter.clear`            | "Clear"                          | Link              |                                           |
| `orders.count`                   | "{total} order / {total} orders" | Body text         | English plural — restructure for Japanese |
| `orders.table.order_num`         | "Order #"                        | Column header     |                                           |
| `orders.table.customer`          | "Customer"                       | Column header     |                                           |
| `orders.table.type`              | "Type"                           | Column header     |                                           |
| `orders.table.media`             | "Media"                          | Column header     |                                           |
| `orders.table.state`             | "State"                          | Column header     |                                           |
| `orders.table.created`           | "Created"                        | Column header     |                                           |
| `orders.empty.title`             | "No orders found"                | Empty state       |                                           |
| `orders.empty.description`       | "Try adjusting your filters."    | Empty state       |                                           |

#### New Order form (Operator)

| Suggested Key                           | English Text                                               | UI Type              | Notes                                                                                             |
| --------------------------------------- | ---------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `orders.new.title`                      | "New Cross-Connect Request"                                | Page heading         |                                                                                                   |
| `orders.new.subtitle`                   | "Create a draft order for review and approval"             | Page subtitle        |                                                                                                   |
| `orders.new.section.service`            | "Service Details"                                          | Section heading      |                                                                                                   |
| `orders.new.service_type_label`         | "Service Type \*"                                          | Form label           |                                                                                                   |
| `orders.new.service_type.cust_carrier`  | "Customer → Carrier"                                       | Select option        | Arrow character → may need escaping; high risk for Japanese                                       |
| `orders.new.service_type.cust_cust`     | "Customer → Customer"                                      | Select option        |                                                                                                   |
| `orders.new.service_type.cust_cloud`    | "Customer → Cloud"                                         | Select option        |                                                                                                   |
| `orders.new.service_type.exchange`      | "Exchange"                                                 | Select option        |                                                                                                   |
| `orders.new.media_type_label`           | "Media Type \*"                                            | Form label           |                                                                                                   |
| `orders.new.media.smf`                  | "SMF (Single-mode Fibre)"                                  | Select option        | Note: customer form says "Single-Mode" (capital M); operator says "Single-mode" — inconsistent    |
| `orders.new.media.mmf`                  | "MMF (Multi-mode Fibre)"                                   | Select option        |                                                                                                   |
| `orders.new.media.cat6`                 | "Cat6 Copper"                                              | Select option        | Customer form says "CAT6 (Copper)" — inconsistent                                                 |
| `orders.new.media.coax`                 | "Coax"                                                     | Select option        | Customer form says "Coax" — consistent                                                            |
| `orders.new.media.dac`                  | "DAC (Direct Attach Copper)"                               | Select option        |                                                                                                   |
| `orders.new.speed_label`                | "Speed (Gbps)"                                             | Form label           |                                                                                                   |
| `orders.new.speed_placeholder`          | "e.g. 1, 10, 100"                                          | Placeholder          |                                                                                                   |
| `orders.new.customer_ref_label`         | "Customer Reference"                                       | Form label           |                                                                                                   |
| `orders.new.customer_ref_placeholder`   | "Your internal ticket or PO number"                        | Placeholder          |                                                                                                   |
| `orders.new.requested_active_label`     | "Requested Active Date"                                    | Form label           |                                                                                                   |
| `orders.new.temporary_label`            | "Temporary cross-connect"                                  | Checkbox label       |                                                                                                   |
| `orders.new.temporary_hint`             | "Requires an expiry date"                                  | Helper text          |                                                                                                   |
| `orders.new.expiry_label`               | "Expiry Date \*"                                           | Form label           | Shown conditionally                                                                               |
| `orders.new.section.a_side`             | "A-Side (Source)"                                          | Section heading      |                                                                                                   |
| `orders.new.section.z_side`             | "Z-Side (Destination)"                                     | Section heading      | Operator portal uses "Source/Destination"; customer portal uses "Your Equipment/Remote / Carrier" |
| `orders.new.endpoint_type_label`        | "Endpoint Type \*"                                         | Form label           |                                                                                                   |
| `orders.new.endpoint.customer`          | "Customer"                                                 | Select option        |                                                                                                   |
| `orders.new.endpoint.carrier`           | "Carrier"                                                  | Select option        |                                                                                                   |
| `orders.new.endpoint.cloud_onramp`      | "Cloud On-Ramp"                                            | Select option        |                                                                                                   |
| `orders.new.endpoint.exchange`          | "Exchange"                                                 | Select option        |                                                                                                   |
| `orders.new.endpoint.internal`          | "Internal"                                                 | Select option        |                                                                                                   |
| `orders.new.org_label`                  | "Organization"                                             | Form label           |                                                                                                   |
| `orders.new.org_placeholder`            | "— Select if applicable —"                                 | Select option        |                                                                                                   |
| `orders.new.demarc_label`               | "Demarc Description"                                       | Form label           |                                                                                                   |
| `orders.new.demarc_placeholder`         | "e.g. Suite 400, Room 12, Panel B Port 3"                  | Placeholder          |                                                                                                   |
| `orders.new.section.notes`              | "Additional Notes"                                         | Section heading      |                                                                                                   |
| `orders.new.notes_placeholder`          | "Any additional requirements or context for this request…" | Textarea placeholder |                                                                                                   |
| `orders.new.cancel`                     | "Cancel"                                                   | Button               |                                                                                                   |
| `orders.new.submit`                     | "Create Draft Order"                                       | Button               |                                                                                                   |
| `orders.new.submitting`                 | "Creating…"                                                | Button (loading)     |                                                                                                   |
| `orders.new.validation.required`        | "Required"                                                 | Field error          |                                                                                                   |
| `orders.new.validation.expiry_required` | "Required for temporary cross-connects"                    | Field error          |                                                                                                   |
| `orders.new.error.create_failed`        | "Failed to create order. Please try again."                | Form error           |                                                                                                   |

#### Order Detail (Operator)

| Suggested Key                          | English Text                 | UI Type         | Notes |
| -------------------------------------- | ---------------------------- | --------------- | ----- |
| `order.detail.section.details`         | "Order Details"              | Section heading |       |
| `order.detail.field.order_num`         | "Order Number"               | Detail label    |       |
| `order.detail.field.state`             | "State"                      | Detail label    |       |
| `order.detail.field.service_type`      | "Service Type"               | Detail label    |       |
| `order.detail.field.media_type`        | "Media Type"                 | Detail label    |       |
| `order.detail.field.speed`             | "Speed"                      | Detail label    |       |
| `order.detail.field.temporary`         | "Temporary"                  | Detail label    |       |
| `order.detail.field.requested_active`  | "Requested Active"           | Detail label    |       |
| `order.detail.field.expires_at`        | "Expires At"                 | Detail label    |       |
| `order.detail.field.notes`             | "Notes"                      | Detail label    |       |
| `order.detail.section.requesting_org`  | "Requesting Organization"    | Section heading |       |
| `order.detail.field.organization`      | "Organization"               | Detail label    |       |
| `order.detail.field.submitted_by`      | "Submitted By"               | Detail label    |       |
| `order.detail.field.created`           | "Created"                    | Detail label    |       |
| `order.detail.field.last_updated`      | "Last Updated"               | Detail label    |       |
| `order.detail.section.review`          | "Review & Decision"          | Section heading |       |
| `order.detail.field.approved_by`       | "Approved By"                | Detail label    |       |
| `order.detail.field.approved_at`       | "Approved At"                | Detail label    |       |
| `order.detail.field.rejection_reason`  | "Rejection Reason"           | Detail label    |       |
| `order.detail.section.audit`           | "Audit Trail"                | Section heading |       |
| `order.detail.section.actions`         | "Actions"                    | Section heading |       |
| `order.detail.section.timeline`        | "Order Timeline"             | Section heading |       |
| `order.detail.timeline.created`        | "Order created"              | Timeline event  |       |
| `order.detail.timeline.submitted`      | "Submitted for review"       | Timeline event  |       |
| `order.detail.timeline.review_started` | "Feasibility review started" | Timeline event  |       |
| `order.detail.timeline.approved`       | "Approved"                   | Timeline event  |       |
| `order.detail.timeline.rejected`       | "Rejected"                   | Timeline event  |       |
| `order.detail.timeline.cancelled`      | "Cancelled"                  | Timeline event  |       |

#### Order Actions panel

| Suggested Key                                      | English Text                                                     | UI Type       | Notes |
| -------------------------------------------------- | ---------------------------------------------------------------- | ------------- | ----- |
| `order.action.submit`                              | "Submit for Review"                                              | Button        |       |
| `order.action.start_review`                        | "Start Feasibility Review"                                       | Button        |       |
| `order.action.confirm_feasibility`                 | "Confirm Feasibility"                                            | Button        |       |
| `order.action.approve`                             | "Approve"                                                        | Button        |       |
| `order.action.reject`                              | "Reject"                                                         | Button        |       |
| `order.action.cancel`                              | "Cancel"                                                         | Button        |       |
| `order.action.panel.feasibility.title`             | "Confirm Feasibility"                                            | Panel heading |       |
| `order.action.panel.feasibility.hint`              | "Confirming feasibility moves the order to the Approvals Queue." | Help text     |       |
| `order.action.panel.feasibility.notes_placeholder` | "Technical notes (optional)…"                                    | Textarea      |       |
| `order.action.panel.feasibility.confirm`           | "Confirm & Send to Approval"                                     | Button        |       |
| `order.action.panel.approve.title`                 | "Approve Order"                                                  | Panel heading |       |
| `order.action.panel.approve.notes_placeholder`     | "Approval notes (optional)…"                                     | Textarea      |       |
| `order.action.panel.approve.confirm`               | "Confirm Approval"                                               | Button        |       |
| `order.action.panel.reject.title`                  | "Reject this order"                                              | Panel heading |       |
| `order.action.panel.reject.reason_placeholder`     | "Reason for rejection (min 10 characters)…"                      | Textarea      |       |
| `order.action.panel.reject.confirm`                | "Confirm Rejection"                                              | Button        |       |
| `order.action.panel.cancel.title`                  | "Cancel this order"                                              | Panel heading |       |
| `order.action.panel.cancel.reason_placeholder`     | "Reason for cancellation…"                                       | Textarea      |       |
| `order.action.panel.cancel.confirm`                | "Confirm Cancellation"                                           | Button        |       |
| `order.action.panel.back`                          | "Back"                                                           | Button        |       |

#### Create Work Order button (on order detail)

| Suggested Key                       | English Text                        | UI Type           | Notes |
| ----------------------------------- | ----------------------------------- | ----------------- | ----- |
| `order.create_wo.button`            | "Create Work Order"                 | Button            |       |
| `order.create_wo.form.title`        | "New Work Order"                    | Mini-form heading |       |
| `order.create_wo.type_label`        | "Type"                              | Form label        |       |
| `order.create_wo.type.install`      | "Install"                           | Select option     |       |
| `order.create_wo.type.disconnect`   | "Disconnect"                        | Select option     |       |
| `order.create_wo.type.reroute`      | "Reroute"                           | Select option     |       |
| `order.create_wo.type.repair`       | "Repair"                            | Select option     |       |
| `order.create_wo.type.audit_check`  | "Audit Check"                       | Select option     |       |
| `order.create_wo.notes_label`       | "Notes (optional)"                  | Form label        |       |
| `order.create_wo.notes_placeholder` | "Optional notes for the technician" | Placeholder       |       |
| `order.create_wo.creating`          | "Creating…"                         | Button (loading)  |       |
| `order.create_wo.create`            | "Create"                            | Button            |       |
| `order.create_wo.cancel`            | "Cancel"                            | Button            |       |
| `order.create_wo.error.default`     | "Failed to create work order"       | Error message     |       |

---

### 6.6 Approvals Queue (Operator)

Route: `/approvals`

| Suggested Key                  | English Text                                       | UI Type       | Notes                                      |
| ------------------------------ | -------------------------------------------------- | ------------- | ------------------------------------------ |
| `approvals.title`              | "Work Queue"                                       | Page heading  | Nav says "Approvals Queue" — inconsistency |
| `approvals.subtitle`           | "{n} order(s) needing attention"                   | Page subtitle | Plural construction hardcoded              |
| `approvals.empty.title`        | "Approval queue is empty"                          | Empty state   |                                            |
| `approvals.empty.description`  | "All orders have been reviewed. Check back later." | Empty state   |                                            |
| `approvals.table.order_num`    | "Order #"                                          | Column header |                                            |
| `approvals.table.customer`     | "Customer"                                         | Column header |                                            |
| `approvals.table.service_type` | "Service Type"                                     | Column header |                                            |
| `approvals.table.media`        | "Media"                                            | Column header |                                            |
| `approvals.table.state`        | "State"                                            | Column header |                                            |
| `approvals.table.submitted`    | "Submitted"                                        | Column header |                                            |

---

### 6.7 Services (Operator)

Route: `/services`, `/services/[id]`

#### Services list

| Suggested Key                        | English Text                                                                   | UI Type       | Notes                                  |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------------- | -------------------------------------- |
| `services.title`                     | "Active Services"                                                              | Page heading  | Also used as customer portal nav label |
| `services.subtitle`                  | "{total} total"                                                                | Subtitle      |                                        |
| `services.search_placeholder`        | "Search service number…"                                                       | Placeholder   |                                        |
| `services.filter.all_states`         | "All states"                                                                   | Select option |                                        |
| `services.filter.provisioning`       | "Provisioning"                                                                 | Select option |                                        |
| `services.filter.active`             | "Active"                                                                       | Select option |                                        |
| `services.filter.suspended`          | "Suspended"                                                                    | Select option |                                        |
| `services.filter.pending_disconnect` | "Pending Disconnect"                                                           | Select option |                                        |
| `services.filter.disconnected`       | "Disconnected"                                                                 | Select option |                                        |
| `services.filter.label`              | "Filter by state"                                                              | SR label      |                                        |
| `services.filter.button`             | "Search"                                                                       | Button        |                                        |
| `services.filter.clear`              | "Clear"                                                                        | Link          |                                        |
| `services.table.service_num`         | "Service #"                                                                    | Column header |                                        |
| `services.table.state`               | "State"                                                                        | Column header |                                        |
| `services.table.temporary`           | "Temporary"                                                                    | Column header |                                        |
| `services.table.activated`           | "Activated"                                                                    | Column header |                                        |
| `services.table.expires`             | "Expires"                                                                      | Column header |                                        |
| `services.table.a_side`              | "A-Side"                                                                       | Column header |                                        |
| `services.table.z_side`              | "Z-Side"                                                                       | Column header |                                        |
| `services.empty.title`               | "No services found"                                                            | Empty state   |                                        |
| `services.empty.description`         | "Services are created when cross-connect orders are approved and provisioned." | Empty state   |                                        |

#### Service Detail

| Suggested Key                                 | English Text                                                          | UI Type                        | Notes                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `service.detail.subtitle`                     | "Cross-Connect Service"                                               | Page subtitle                  |                                                                           |
| `service.detail.section.details`              | "Service Details"                                                     | Section heading                |                                                                           |
| `service.detail.field.state`                  | "State"                                                               | Detail label                   |                                                                           |
| `service.detail.field.type`                   | "Type"                                                                | Detail label                   |                                                                           |
| `service.detail.field.media`                  | "Media"                                                               | Detail label                   |                                                                           |
| `service.detail.field.speed`                  | "Speed"                                                               | Detail label                   |                                                                           |
| `service.detail.field.activated`              | "Activated"                                                           | Detail label                   |                                                                           |
| `service.detail.field.expires`                | "Expires"                                                             | Detail label                   |                                                                           |
| `service.detail.field.temporary`              | "Temporary"                                                           | Detail label                   |                                                                           |
| `service.detail.field.order`                  | "Order"                                                               | Detail label                   |                                                                           |
| `service.detail.section.endpoints`            | "Endpoints"                                                           | Section heading                | Also "ENDPOINTS" uppercase in some places                                 |
| `service.detail.endpoint.a_side`              | "A-Side"                                                              | Card heading                   |                                                                           |
| `service.detail.endpoint.z_side`              | "Z-Side"                                                              | Card heading                   |                                                                           |
| `service.detail.endpoint.no_data`             | "No endpoint data"                                                    | Fallback                       |                                                                           |
| `service.detail.endpoint.demarc`              | "Demarc: {value}"                                                     | Body text                      | Concatenation                                                             |
| `service.detail.endpoint.panel`               | "Panel: {code} — {name}"                                              | Body text                      | Concatenation                                                             |
| `service.detail.endpoint.type`                | "Type"                                                                | Detail label (customer portal) |                                                                           |
| `service.detail.endpoint.org`                 | "Organisation"                                                        | Detail label (customer portal) | Note: "Organisation" (British spelling) in customer portal service detail |
| `service.detail.endpoint.demarc_point`        | "Demarc Point"                                                        | Detail label (customer portal) |                                                                           |
| `service.detail.section.cable_paths`          | "Cable Paths"                                                         | Section heading                |                                                                           |
| `service.detail.cable_path.none`              | "No cable paths planned yet."                                         | Empty state                    |                                                                           |
| `service.detail.cable_path.api_hint`          | "Use the API (POST /services/{id}/cable-paths) to plan a cable path." | Help text                      | Technical/internal — may not need translation                             |
| `service.detail.cable_path.path_label`        | "{role} path"                                                         | Cell text                      | e.g. "primary path" — via `.replace(/_/g, ' ')`                           |
| `service.detail.cable_path.no_segments`       | "No segments recorded."                                               | Empty state                    |                                                                           |
| `service.detail.cable_path.table.seq`         | "#"                                                                   | Column header                  |                                                                           |
| `service.detail.cable_path.table.from_port`   | "From Port"                                                           | Column header                  |                                                                           |
| `service.detail.cable_path.table.to_port`     | "To Port"                                                             | Column header                  |                                                                           |
| `service.detail.cable_path.table.type`        | "Type"                                                                | Column header                  |                                                                           |
| `service.detail.cable_path.table.cable_label` | "Cable Label"                                                         | Column header                  |                                                                           |
| `service.detail.section.requesting_org`       | "Requesting Organisation"                                             | Section heading                | British "Organisation" — inconsistency with rest of app                   |
| `service.detail.section.actions`              | "Actions"                                                             | Section heading                |                                                                           |
| `service.detail.no_actions`                   | "No actions available — service is disconnected."                     | Notice                         |                                                                           |

#### Service Actions

| Suggested Key                                | English Text                                                                                                      | UI Type       | Notes                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| `service.action.suspend`                     | "Suspend"                                                                                                         | Button        |                                                          |
| `service.action.resume`                      | "Resume Service"                                                                                                  | Button        |                                                          |
| `service.action.disconnect`                  | "Request Disconnect"                                                                                              | Button        |                                                          |
| `service.action.abort`                       | "Abort Provisioning"                                                                                              | Button        |                                                          |
| `service.action.extend`                      | "Extend Expiry"                                                                                                   | Button        |                                                          |
| `service.action.panel.suspend.title`         | "Suspend Service"                                                                                                 | Panel heading |                                                          |
| `service.action.panel.suspend.reason`        | "Reason (optional)…"                                                                                              | Placeholder   |                                                          |
| `service.action.panel.suspend.confirm`       | "Suspend"                                                                                                         | Button        |                                                          |
| `service.action.panel.disconnect.title`      | "Request Disconnection"                                                                                           | Panel heading |                                                          |
| `service.action.panel.disconnect.warning`    | "This will move the service to pending_disconnect state. A work order will be needed to physically decommission." | Warning text  | Contains raw enum value `pending_disconnect` — high risk |
| `service.action.panel.disconnect.reason`     | "Reason for disconnection…"                                                                                       | Placeholder   |                                                          |
| `service.action.panel.disconnect.confirm`    | "Request Disconnect"                                                                                              | Button        |                                                          |
| `service.action.panel.abort.title`           | "Abort Provisioning"                                                                                              | Panel heading |                                                          |
| `service.action.panel.abort.reason`          | "Reason (min 5 chars)…"                                                                                           | Placeholder   |                                                          |
| `service.action.panel.abort.confirm`         | "Abort"                                                                                                           | Button        |                                                          |
| `service.action.panel.extend.title`          | "Extend Service Expiry"                                                                                           | Panel heading |                                                          |
| `service.action.panel.extend.current_expiry` | "Current expiry: {date}"                                                                                          | Body text     |                                                          |
| `service.action.panel.extend.confirm`        | "Extend"                                                                                                          | Button        |                                                          |
| `service.action.error.select_date`           | "Please select a new expiry date"                                                                                 | Error message |                                                          |
| `service.action.panel.back`                  | "Back"                                                                                                            | Button        |                                                          |

#### Cable Path Actions

| Suggested Key                      | English Text     | UI Type | Notes                                                     |
| ---------------------------------- | ---------------- | ------- | --------------------------------------------------------- |
| `cable_path.action.mark_installed` | "Mark Installed" | Button  |                                                           |
| `cable_path.action.activate`       | "Activate"       | Button  | Same word used for Service state change — context differs |
| `cable_path.action.decommission`   | "Decommission"   | Button  |                                                           |

---

### 6.8 Work Orders (Operator)

Route: `/work-orders`, `/work-orders/[id]`

#### Work Orders list

| Suggested Key                     | English Text                                                      | UI Type       | Notes |
| --------------------------------- | ----------------------------------------------------------------- | ------------- | ----- |
| `work_orders.title`               | "Work Orders"                                                     | Page heading  |       |
| `work_orders.subtitle`            | "{total} total"                                                   | Subtitle      |       |
| `work_orders.search_placeholder`  | "Search WO number…"                                               | Placeholder   |       |
| `work_orders.filter.all_states`   | "All states"                                                      | Select option |       |
| `work_orders.filter.created`      | "Created"                                                         | Select option |       |
| `work_orders.filter.assigned`     | "Assigned"                                                        | Select option |       |
| `work_orders.filter.in_progress`  | "In Progress"                                                     | Select option |       |
| `work_orders.filter.pending_test` | "Pending Test"                                                    | Select option |       |
| `work_orders.filter.completed`    | "Completed"                                                       | Select option |       |
| `work_orders.filter.cancelled`    | "Cancelled"                                                       | Select option |       |
| `work_orders.filter.all_types`    | "All types"                                                       | Select option |       |
| `work_orders.filter.install`      | "Install"                                                         | Select option |       |
| `work_orders.filter.disconnect`   | "Disconnect"                                                      | Select option |       |
| `work_orders.filter.reroute`      | "Reroute"                                                         | Select option |       |
| `work_orders.filter.repair`       | "Repair"                                                          | Select option |       |
| `work_orders.filter.audit_check`  | "Audit Check"                                                     | Select option |       |
| `work_orders.filter.button`       | "Filter"                                                          | Button        |       |
| `work_orders.table.wo_num`        | "WO #"                                                            | Column header |       |
| `work_orders.table.type`          | "Type"                                                            | Column header |       |
| `work_orders.table.state`         | "State"                                                           | Column header |       |
| `work_orders.table.service`       | "Service"                                                         | Column header |       |
| `work_orders.table.assigned_to`   | "Assigned To"                                                     | Column header |       |
| `work_orders.table.created`       | "Created"                                                         | Column header |       |
| `work_orders.table.unassigned`    | "Unassigned"                                                      | Cell text     |       |
| `work_orders.table.view`          | "View"                                                            | Link          |       |
| `work_orders.empty.title`         | "No work orders found"                                            | Empty state   |       |
| `work_orders.empty.description`   | "Work orders are created when cross-connect orders are approved." | Empty state   |       |

#### Work Order Detail

| Suggested Key                              | English Text                | UI Type          | Notes                               |
| ------------------------------------------ | --------------------------- | ---------------- | ----------------------------------- |
| `work_order.detail.subtitle`               | "{type} work order"         | Page subtitle    | e.g. "install work order" — dynamic |
| `work_order.detail.section.details`        | "Details"                   | Section heading  |                                     |
| `work_order.detail.field.wo_num`           | "WO Number"                 | Detail label     |                                     |
| `work_order.detail.field.type`             | "Type"                      | Detail label     |                                     |
| `work_order.detail.field.state`            | "State"                     | Detail label     |                                     |
| `work_order.detail.field.service`          | "Service"                   | Detail label     |                                     |
| `work_order.detail.field.assigned_to`      | "Assigned To"               | Detail label     |                                     |
| `work_order.detail.field.unassigned`       | "Unassigned"                | Italic fallback  |                                     |
| `work_order.detail.field.scheduled_at`     | "Scheduled At"              | Detail label     |                                     |
| `work_order.detail.field.completed_at`     | "Completed At"              | Detail label     |                                     |
| `work_order.detail.field.created`          | "Created"                   | Detail label     |                                     |
| `work_order.detail.section.tech_notes`     | "Tech Notes"                | Section heading  |                                     |
| `work_order.detail.section.cable_path`     | "Cable Path"                | Section heading  |                                     |
| `work_order.detail.cable_path.no_segments` | "No segments recorded."     | Empty state      |                                     |
| `work_order.detail.section.audit`          | "Audit Trail"               | Section heading  |                                     |
| `work_order.detail.audit.by`               | "by {firstName} {lastName}" | Body text        | Concatenation with name             |
| `work_order.detail.section.actions`        | "Actions"                   | Section heading  |                                     |
| `work_order.detail.section.progress`       | "Progress"                  | Timeline heading |                                     |
| `work_order.detail.timeline.created`       | "Work order created"        | Timeline item    |                                     |
| `work_order.detail.timeline.assigned`      | "Assigned to technician"    | Timeline item    |                                     |
| `work_order.detail.timeline.in_progress`   | "Work started"              | Timeline item    |                                     |
| `work_order.detail.timeline.pending_test`  | "Ready for testing"         | Timeline item    |                                     |
| `work_order.detail.timeline.completed`     | "Completed"                 | Timeline item    |                                     |
| `work_order.detail.timeline.cancelled`     | "Cancelled"                 | Timeline item    |                                     |

#### Work Order Actions

| Suggested Key                               | English Text                                                                     | UI Type           | Notes                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `wo.action.assign`                          | "Assign"                                                                         | Button            |                                                                |
| `wo.action.reassign`                        | "Reassign"                                                                       | Button            |                                                                |
| `wo.action.start`                           | "Start Work"                                                                     | Button            |                                                                |
| `wo.action.mark_ready`                      | "Mark Ready for Test"                                                            | Button            |                                                                |
| `wo.action.complete`                        | "Complete"                                                                       | Button            |                                                                |
| `wo.action.test_failed`                     | "Test Failed"                                                                    | Button            |                                                                |
| `wo.action.cancel`                          | "Cancel"                                                                         | Button            |                                                                |
| `wo.action.panel.assign.title`              | "Assign Work Order"                                                              | Panel heading     |                                                                |
| `wo.action.panel.assign.hint`               | "Paste the technician's user ID (UUID). You can look this up in the Users list." | Help text         | UUID-specific instruction — may need clarification in Japanese |
| `wo.action.panel.assign.placeholder`        | "Technician user ID (UUID)…"                                                     | Input placeholder |                                                                |
| `wo.action.panel.assign.confirm`            | "Confirm Assignment"                                                             | Button            |                                                                |
| `wo.action.panel.ready.title`               | "Mark Ready for Test"                                                            | Panel heading     |                                                                |
| `wo.action.panel.test_failed.title`         | "Report Test Failure"                                                            | Panel heading     |                                                                |
| `wo.action.panel.complete.title`            | "Complete Work Order"                                                            | Panel heading     |                                                                |
| `wo.action.panel.cancel.title`              | "Cancel Work Order"                                                              | Panel heading     |                                                                |
| `wo.action.panel.notes_placeholder`         | "Tech notes (optional)…"                                                         | Textarea          |                                                                |
| `wo.action.panel.cancel_reason_placeholder` | "Cancellation reason…"                                                           | Textarea          |                                                                |
| `wo.action.panel.confirm`                   | "Confirm"                                                                        | Button            |                                                                |
| `wo.action.panel.back`                      | "Back"                                                                           | Button            |                                                                |

---

### 6.9 Organizations (Operator)

Route: `/organizations`, `/organizations/new`, `/organizations/[id]`, `/organizations/[id]/edit`, `/organizations/[id]/users/new`

#### Organizations list

| Suggested Key                | English Text                                               | UI Type       | Notes |
| ---------------------------- | ---------------------------------------------------------- | ------------- | ----- |
| `orgs.title`                 | "Organizations"                                            | Page heading  |       |
| `orgs.new_button`            | "+ New Organization"                                       | Button        |       |
| `orgs.search_placeholder`    | "Search name or code…"                                     | Placeholder   |       |
| `orgs.filter.all_types`      | "All types"                                                | Select option |       |
| `orgs.filter.customer`       | "Customer"                                                 | Select option |       |
| `orgs.filter.carrier`        | "Carrier"                                                  | Select option |       |
| `orgs.filter.operator`       | "Operator"                                                 | Select option |       |
| `orgs.filter.cloud_provider` | "Cloud Provider"                                           | Select option |       |
| `orgs.filter.exchange`       | "Exchange"                                                 | Select option |       |
| `orgs.filter.button`         | "Filter"                                                   | Button        |       |
| `orgs.filter.clear`          | "Clear"                                                    | Button        |       |
| `orgs.table.name`            | "Name"                                                     | Column header |       |
| `orgs.table.code`            | "Code"                                                     | Column header |       |
| `orgs.table.type`            | "Type"                                                     | Column header |       |
| `orgs.table.contact`         | "Contact"                                                  | Column header |       |
| `orgs.table.status`          | "Status"                                                   | Column header |       |
| `orgs.empty.title`           | "No organizations found"                                   | Empty state   |       |
| `orgs.empty.description`     | "Try adjusting your filters or create a new organization." | Empty state   |       |

#### Organization Detail

| Suggested Key                    | English Text                                                 | UI Type         | Notes                |
| -------------------------------- | ------------------------------------------------------------ | --------------- | -------------------- |
| `org.detail.section.details`     | "Organization Details"                                       | Section heading |                      |
| `org.detail.field.name`          | "Name"                                                       | Detail label    |                      |
| `org.detail.field.code`          | "Code"                                                       | Detail label    |                      |
| `org.detail.field.type`          | "Type"                                                       | Detail label    |                      |
| `org.detail.field.status`        | "Status"                                                     | Detail label    |                      |
| `org.detail.field.contact_email` | "Contact Email"                                              | Detail label    |                      |
| `org.detail.field.contact_phone` | "Contact Phone"                                              | Detail label    |                      |
| `org.detail.field.created`       | "Created"                                                    | Detail label    |                      |
| `org.detail.edit_button`         | "Edit"                                                       | Button          |                      |
| `org.detail.users.heading`       | "Users ({count})"                                            | Section heading | Dynamic count        |
| `org.detail.users.add`           | "+ Add user"                                                 | Link            |                      |
| `org.detail.users.empty`         | "No users yet."                                              | Empty state     |                      |
| `org.detail.users.table.name`    | "Name"                                                       | Column header   |                      |
| `org.detail.users.table.email`   | "Email"                                                      | Column header   |                      |
| `org.detail.users.table.role`    | "Role"                                                       | Column header   |                      |
| `org.detail.users.table.status`  | "Status"                                                     | Column header   |                      |
| `org.detail.orders.heading`      | "Cross-Connect Orders"                                       | Section heading |                      |
| `org.detail.orders.description`  | "View all orders for this organization via the orders list." | Body text       | Contains inline link |

#### Deactivate buttons

| Suggested Key                   | English Text                                            | UI Type          | Notes                  |
| ------------------------------- | ------------------------------------------------------- | ---------------- | ---------------------- |
| `org.deactivate.button`         | "Deactivate"                                            | Button           |                        |
| `org.deactivate.confirm.org`    | "Deactivate \"{orgName}\"? All users will lose access." | Confirm text     | Interpolates org name  |
| `org.deactivate.confirm.user`   | "Deactivate \"{userName}\"?"                            | Confirm text     | Interpolates user name |
| `org.deactivate.in_progress`    | "Deactivating…"                                         | Button (loading) |                        |
| `org.deactivate.confirm_button` | "Confirm"                                               | Button           |                        |
| `org.deactivate.cancel`         | "Cancel"                                                | Button           |                        |
| `org.deactivate.error`          | "Failed to deactivate. Please try again."               | Error message    |                        |

#### New Organization form

| Suggested Key                             | English Text                                        | UI Type          | Notes |
| ----------------------------------------- | --------------------------------------------------- | ---------------- | ----- |
| `org.new.title`                           | "New Organization"                                  | Page heading     |       |
| `org.new.subtitle`                        | "Create a customer, carrier, or other organization" | Subtitle         |       |
| `org.new.field.name`                      | "Organization Name \*"                              | Form label       |       |
| `org.new.field.name_placeholder`          | "e.g. Acme Telecom"                                 | Placeholder      |       |
| `org.new.field.code`                      | "Code \*"                                           | Form label       |       |
| `org.new.field.code_placeholder`          | "e.g. ACME"                                         | Placeholder      |       |
| `org.new.field.code_hint`                 | "Uppercase letters, numbers, - or \_ only"          | Helper text      |       |
| `org.new.field.type`                      | "Type \*"                                           | Form label       |       |
| `org.new.field.type_placeholder`          | "Select type..."                                    | Select option    |       |
| `org.new.field.contact_email`             | "Contact Email"                                     | Form label       |       |
| `org.new.field.contact_email_placeholder` | "admin@example.com"                                 | Placeholder      |       |
| `org.new.field.contact_phone`             | "Contact Phone"                                     | Form label       |       |
| `org.new.field.contact_phone_placeholder` | "+1 555 000 0000"                                   | Placeholder      |       |
| `org.new.field.notes`                     | "Notes"                                             | Form label       |       |
| `org.new.field.notes_placeholder`         | "Optional notes..."                                 | Placeholder      |       |
| `org.new.cancel`                          | "Cancel"                                            | Button           |       |
| `org.new.submit`                          | "Create Organization"                               | Button           |       |
| `org.new.saving`                          | "Saving..."                                         | Button (loading) |       |
| `org.new.error.default`                   | "Failed to create organization."                    | Error            |       |

#### Edit Organization form

| Suggested Key                  | English Text        | UI Type          | Notes                                             |
| ------------------------------ | ------------------- | ---------------- | ------------------------------------------------- |
| `org.edit.field.name`          | "Organisation Name" | Form label       | British spelling — inconsistency with rest of app |
| `org.edit.field.contact_email` | "Contact Email"     | Form label       |                                                   |
| `org.edit.field.contact_phone` | "Contact Phone"     | Form label       |                                                   |
| `org.edit.field.optional`      | "Optional"          | Placeholder      |                                                   |
| `org.edit.submit`              | "Save Changes"      | Button           |                                                   |
| `org.edit.saving`              | "Saving…"           | Button (loading) |                                                   |
| `org.edit.cancel`              | "Cancel"            | Button           |                                                   |
| `org.edit.error.default`       | "Update failed"     | Error            |                                                   |

#### Add User (Operator) form

| Suggested Key                             | English Text                | UI Type          | Notes                                                      |
| ----------------------------------------- | --------------------------- | ---------------- | ---------------------------------------------------------- |
| `org.add_user.title`                      | "Add User"                  | Page heading     |                                                            |
| `org.add_user.org_label`                  | "Adding user to: {orgName}" | Banner text      | Dynamic org name                                           |
| `org.add_user.field.first_name`           | "First Name \*"             | Form label       |                                                            |
| `org.add_user.field.last_name`            | "Last Name \*"              | Form label       |                                                            |
| `org.add_user.field.email`                | "Email \*"                  | Form label       |                                                            |
| `org.add_user.field.password`             | "Password \*"               | Form label       |                                                            |
| `org.add_user.field.password_placeholder` | "Min 12 characters"         | Placeholder      |                                                            |
| `org.add_user.field.role`                 | "Role \*"                   | Form label       |                                                            |
| `org.add_user.role.customer_admin`        | "Customer Admin"            | Select option    | Different wording from the customer portal's role selector |
| `org.add_user.role.customer_orderer`      | "Customer Orderer"          | Select option    |                                                            |
| `org.add_user.role.customer_viewer`       | "Customer Viewer"           | Select option    |                                                            |
| `org.add_user.role.ops_technician`        | "Ops Technician"            | Select option    |                                                            |
| `org.add_user.role.ops_manager`           | "Ops Manager"               | Select option    |                                                            |
| `org.add_user.submit`                     | "Create User"               | Button           |                                                            |
| `org.add_user.creating`                   | "Creating…"                 | Button (loading) |                                                            |
| `org.add_user.cancel`                     | "Cancel"                    | Button           |                                                            |
| `org.add_user.error.default`              | "Failed to create user"     | Error            |                                                            |

---

### 6.10 Inventory (Operator)

Route: `/inventory`

| Suggested Key                        | English Text                                        | UI Type         | Notes                                 |
| ------------------------------------ | --------------------------------------------------- | --------------- | ------------------------------------- |
| `inventory.title`                    | "Inventory"                                         | Page heading    |                                       |
| `inventory.subtitle`                 | "Panel and port availability across the datacenter" | Subtitle        |                                       |
| `inventory.view_site_hierarchy`      | "View Site Hierarchy"                               | Link            |                                       |
| `inventory.availability.heading`     | "{siteName} — Port Availability by Room"            | Section heading | Dynamic site name; dash separator     |
| `inventory.panel.available_of_total` | "{available} / {total} available"                   | Body text       | Concatenation                         |
| `inventory.panel.no_ports`           | "No ports provisioned."                             | Empty state     |                                       |
| `inventory.table.label`              | "Label"                                             | Column header   |                                       |
| `inventory.table.media`              | "Media"                                             | Column header   |                                       |
| `inventory.table.connector`          | "Connector"                                         | Column header   |                                       |
| `inventory.table.strand`             | "Strand"                                            | Column header   |                                       |
| `inventory.table.state`              | "State"                                             | Column header   |                                       |
| `inventory.table.notes`              | "Notes"                                             | Column header   |                                       |
| `inventory.room.ports_free`          | "{available} / {total} ports free"                  | Summary card    | Slightly different wording from panel |

---

### 6.11 Locations (Operator)

Route: `/locations`, `/locations/new`, `/locations/[siteId]`

| Suggested Key                 | English Text                                                                | UI Type          | Notes |
| ----------------------------- | --------------------------------------------------------------------------- | ---------------- | ----- |
| `locations.title`             | "Locations"                                                                 | Page heading     |       |
| `locations.subtitle`          | "Sites and physical infrastructure"                                         | Subtitle         |       |
| `locations.new_button`        | "+ New Site"                                                                | Button           |       |
| `locations.empty.title`       | "No sites configured"                                                       | Empty state      |       |
| `locations.empty.description` | "Add your first datacenter site to start managing physical infrastructure." | Empty state      |       |
| `locations.card.added`        | "Added {date}"                                                              | Card footer text |       |
| `locations.card.city_country` | "{city}, {country}"                                                         | Body text        |       |

---

### 6.12 Billing Events (Operator)

Route: `/billing`

| Suggested Key               | English Text                                                                                                | UI Type        | Notes                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `billing.title`             | "Billing Events"                                                                                            | Page heading   | Also `<title>` metadata                                                              |
| `billing.subtitle`          | "{n} pending export(s)"                                                                                     | Subtitle       | English plural                                                                       |
| `billing.empty.title`       | "No pending billing events"                                                                                 | Empty state    |                                                                                      |
| `billing.empty.description` | "All events have been exported to the billing system."                                                      | Empty state    |                                                                                      |
| `billing.table.event_type`  | "Event Type"                                                                                                | Column header  |                                                                                      |
| `billing.table.service`     | "Service"                                                                                                   | Column header  |                                                                                      |
| `billing.table.mrc`         | "MRC"                                                                                                       | Column header  | Abbreviation — glossary needed                                                       |
| `billing.table.nrc`         | "NRC"                                                                                                       | Column header  | Abbreviation — glossary needed                                                       |
| `billing.table.occurred_at` | "Occurred At"                                                                                               | Column header  |                                                                                      |
| `billing.table.exported`    | "Exported"                                                                                                  | Column header  |                                                                                      |
| `billing.badge.pending`     | "Pending"                                                                                                   | Badge          |                                                                                      |
| `billing.hint`              | "To mark events as exported, call POST /api/v1/billing-events/mark-exported from your billing integration." | Help text      | Technical/operator-facing; may not need translation, but contains hardcoded API path |
| `billing.currency`          | "${amount}"                                                                                                 | Amount display | USD format, locale-sensitive                                                         |

---

### 6.13 Audit Log (Operator)

Route: `/audit`

| Suggested Key                       | English Text                  | UI Type       | Notes |
| ----------------------------------- | ----------------------------- | ------------- | ----- |
| `audit.title`                       | "Audit Log"                   | Page heading  |       |
| `audit.subtitle`                    | "{total} total events"        | Subtitle      |       |
| `audit.filter.entity_placeholder`   | "Entity type…"                | Placeholder   |       |
| `audit.filter.action_placeholder`   | "Action…"                     | Placeholder   |       |
| `audit.filter.order_id_placeholder` | "Order ID…"                   | Placeholder   |       |
| `audit.filter.button`               | "Filter"                      | Button        |       |
| `audit.filter.clear`                | "Clear"                       | Link          |       |
| `audit.table.when`                  | "When"                        | Column header |       |
| `audit.table.actor`                 | "Actor"                       | Column header |       |
| `audit.table.entity`                | "Entity"                      | Column header |       |
| `audit.table.action`                | "Action"                      | Column header |       |
| `audit.table.ref`                   | "Ref"                         | Column header |       |
| `audit.empty.title`                 | "No audit events found"       | Empty state   |       |
| `audit.empty.description`           | "Try adjusting your filters." | Empty state   |       |

**Note:** `evt.action` values (e.g. `workorder.created`, `service.disconnect_requested`, `order.approved`) are raw strings displayed directly in the Action column as `Badge` labels. A display name map is needed to show translated labels.

---

### 6.14 Customer Portal

Route: `/portal`

| Suggested Key                   | English Text                                       | UI Type         | Notes                                            |
| ------------------------------- | -------------------------------------------------- | --------------- | ------------------------------------------------ |
| `portal.title`                  | "My Portal"                                        | Page heading    | Also `<title>` metadata                          |
| `portal.action.request`         | "Request Cross-Connect"                            | Button          |                                                  |
| `portal.kpi.active_services`    | "Active Services"                                  | Card label      |                                                  |
| `portal.kpi.in_progress_orders` | "In-Progress Orders"                               | Card label      | Hyphenated; Japanese may need different phrasing |
| `portal.kpi.total_orders`       | "Total Orders"                                     | Card label      |                                                  |
| `portal.recent_orders.heading`  | "Recent Orders"                                    | Section heading |                                                  |
| `portal.recent_orders.view_all` | "View all"                                         | Link            |                                                  |
| `portal.table.order_num`        | "Order #"                                          | Column header   |                                                  |
| `portal.table.type`             | "Type"                                             | Column header   |                                                  |
| `portal.table.state`            | "State"                                            | Column header   |                                                  |
| `portal.table.created`          | "Created"                                          | Column header   |                                                  |
| `portal.empty.can_place`        | "No orders yet — request your first cross-connect" | Empty state     | Inline link in text — concatenation risk         |
| `portal.empty.viewer`           | "No orders have been placed for your account yet." | Empty state     |                                                  |

---

### 6.15 Customer Orders

Route: `/portal/orders`, `/portal/orders/new`, `/portal/orders/[id]`

#### Customer Order List

| Suggested Key                     | English Text                     | UI Type       | Notes                                                       |
| --------------------------------- | -------------------------------- | ------------- | ----------------------------------------------------------- |
| `portal.orders.title`             | "My Cross-Connect Requests"      | Page heading  |                                                             |
| `portal.orders.request_new`       | "Request New"                    | Button        | Short; different from portal home's "Request Cross-Connect" |
| `portal.orders.subtitle`          | "{total} order(s)"               | Subtitle      | Plural                                                      |
| `portal.orders.filter.all_states` | "All states"                     | Select option |                                                             |
| `portal.orders.filter.label`      | "Filter by state"                | SR label      |                                                             |
| `portal.orders.filter.button`     | "Filter"                         | Button        |                                                             |
| `portal.orders.filter.clear`      | "Clear"                          | Link          |                                                             |
| `portal.orders.empty.title`       | "No orders found"                | Empty state   |                                                             |
| `portal.orders.empty.description` | "Try clearing the state filter." | Empty state   | Conditional                                                 |

#### Customer New Order

| Suggested Key                               | English Text                                           | UI Type         | Notes                                            |
| ------------------------------------------- | ------------------------------------------------------ | --------------- | ------------------------------------------------ |
| `portal.orders.new.a_side_label`            | "A-Side (Your Equipment)"                              | Fieldset legend | Different from operator's "A-Side (Source)"      |
| `portal.orders.new.z_side_label`            | "Z-Side (Remote / Carrier)"                            | Fieldset legend | Different from operator's "Z-Side (Destination)" |
| `portal.orders.new.loa_label`               | "LOA Number"                                           | Form label      |                                                  |
| `portal.orders.new.cfa_label`               | "CFA Number"                                           | Form label      |                                                  |
| `portal.orders.new.demarc_label`            | "Demarc Description"                                   | Form label      |                                                  |
| `portal.orders.new.demarc_placeholder`      | "e.g. Rack 12, Panel A, Port 4"                        | Placeholder     |                                                  |
| `portal.orders.new.optional`                | "Optional"                                             | Placeholder     |                                                  |
| `portal.orders.new.error.not_authenticated` | "Not authenticated"                                    | Error           | Technical edge case                              |
| `portal.orders.new.error.expiry_required`   | "Expiry date is required for temporary cross-connects" | Error           |                                                  |
| `portal.orders.new.error.something_wrong`   | "Something went wrong"                                 | Error           | Generic fallback                                 |

#### Customer Order Detail

| Suggested Key                                       | English Text                                                                                   | UI Type         | Notes                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------- |
| `portal.order.section.details`                      | "Details"                                                                                      | Section heading |                                                       |
| `portal.order.section.timeline`                     | "Status Timeline"                                                                              | Section heading | Operator portal says "Order Timeline" — inconsistency |
| `portal.order.field.order_num`                      | "Order #"                                                                                      | Detail label    |                                                       |
| `portal.order.field.service_type`                   | "Service Type"                                                                                 | Detail label    |                                                       |
| `portal.order.field.media`                          | "Media"                                                                                        | Detail label    |                                                       |
| `portal.order.field.speed`                          | "Speed"                                                                                        | Detail label    |                                                       |
| `portal.order.field.temporary`                      | "Temporary"                                                                                    | Detail label    |                                                       |
| `portal.order.field.requested_active`               | "Requested Active"                                                                             | Detail label    |                                                       |
| `portal.order.field.expires`                        | "Expires"                                                                                      | Detail label    |                                                       |
| `portal.order.field.notes`                          | "Notes"                                                                                        | Detail label    |                                                       |
| `portal.order.field.submitted`                      | "Submitted"                                                                                    | Detail label    |                                                       |
| `portal.order.field.last_updated`                   | "Last Updated"                                                                                 | Detail label    |                                                       |
| `portal.order.timeline.draft`                       | "Request created"                                                                              | Timeline item   |                                                       |
| `portal.order.timeline.submitted`                   | "Submitted for review"                                                                         | Timeline item   |                                                       |
| `portal.order.timeline.under_review`                | "Feasibility review in progress"                                                               | Timeline item   |                                                       |
| `portal.order.timeline.pending_approval`            | "Pending final approval"                                                                       | Timeline item   |                                                       |
| `portal.order.timeline.approved`                    | "Approved — provisioning started"                                                              | Timeline item   | Em dash in text                                       |
| `portal.order.timeline.rejected`                    | "Rejected"                                                                                     | Timeline item   |                                                       |
| `portal.order.timeline.cancelled`                   | "Cancelled"                                                                                    | Timeline item   |                                                       |
| `portal.order.timeline.hint`                        | "We'll update this page as your request progresses. No action required from you at this time." | Help text       |                                                       |
| `portal.order.rejection.heading`                    | "Reason for Rejection"                                                                         | Section heading |                                                       |
| `portal.order.banner.live.heading`                  | "Your cross-connect is live!"                                                                  | Banner heading  |                                                       |
| `portal.order.banner.live.body`                     | "Service {serviceNumber} is currently {state}."                                                | Banner body     | Dynamic interpolation + raw state value risk          |
| `portal.order.banner.approved_provisioning.heading` | "Your cross-connect has been approved!"                                                        | Banner heading  |                                                       |
| `portal.order.banner.approved_provisioning.body`    | "Service {serviceNumber} is being provisioned. You can track it in Active Services."           | Banner body     | Inline link in sentence — concatenation risk          |
| `portal.order.banner.approved_no_service.heading`   | "Your cross-connect has been approved!"                                                        | Banner heading  | Identical to above — same key                         |
| `portal.order.banner.approved_no_service.body`      | "Our team will provision your service shortly. You can track it in Active Services."           | Banner body     | Inline link in sentence                               |
| `portal.order.back`                                 | "← Back to My Orders"                                                                          | Link            |                                                       |

---

### 6.16 Customer Services

Route: `/portal/services`, `/portal/services/[id]`

#### Customer Services List

| Suggested Key                       | English Text                                                                              | UI Type      | Notes                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ------------ | ---------------------- |
| `portal.services.title`             | "Active Services"                                                                         | Page heading | Same as operator label |
| `portal.services.subtitle`          | "{total} service(s)"                                                                      | Subtitle     |                        |
| `portal.services.filter.label`      | "Filter by state"                                                                         | SR label     |                        |
| `portal.services.filter.button`     | "Filter"                                                                                  | Button       |                        |
| `portal.services.empty.title`       | "No services found"                                                                       | Empty state  |                        |
| `portal.services.empty.description` | "Services appear here once your cross-connect orders have been approved and provisioned." | Empty state  |                        |

#### Customer Service Detail

| Suggested Key                          | English Text   | UI Type         | Notes                            |
| -------------------------------------- | -------------- | --------------- | -------------------------------- |
| `portal.service.section.endpoints`     | "Endpoints"    | Section heading |                                  |
| `portal.service.endpoint.org`          | "Organisation" | Detail label    | British spelling — inconsistency |
| `portal.service.endpoint.type`         | "Type"         | Detail label    |                                  |
| `portal.service.endpoint.demarc_point` | "Demarc Point" | Detail label    |                                  |

---

### 6.17 Customer Team

Route: `/portal/team`, `/portal/team/new`, `/portal/team/[userId]`

#### Team List

| Suggested Key                   | English Text                                                                         | UI Type          | Notes                               |
| ------------------------------- | ------------------------------------------------------------------------------------ | ---------------- | ----------------------------------- |
| `portal.team.title`             | "My Team"                                                                            | Page heading     | Also `<title>` metadata             |
| `portal.team.subtitle`          | "{orgName} · {n} member(s)"                                                          | Subtitle         | Dot separator · pluralization       |
| `portal.team.invite`            | "+ Invite Member"                                                                    | Button           |                                     |
| `portal.team.empty.title`       | "No team members yet"                                                                | Empty state      |                                     |
| `portal.team.empty.description` | "Invite colleagues to give them access to your organisation's cross-connect portal." | Empty state      | "organisation's" — British spelling |
| `portal.team.table.name`        | "Name"                                                                               | Column header    |                                     |
| `portal.team.table.email`       | "Email"                                                                              | Column header    |                                     |
| `portal.team.table.role`        | "Role"                                                                               | Column header    |                                     |
| `portal.team.table.status`      | "Status"                                                                             | Column header    |                                     |
| `portal.team.you`               | "(you)"                                                                              | Inline badge     |                                     |
| `portal.team.remove_access`     | "Remove access"                                                                      | Button           |                                     |
| `portal.team.confirm_remove`    | "Remove access for \"{name}\"?"                                                      | Confirm text     |                                     |
| `portal.team.removing`          | "Removing…"                                                                          | Button (loading) |                                     |
| `portal.team.error.remove`      | "Failed to remove access. Please try again."                                         | Error            |                                     |

#### Invite Team Member form

| Suggested Key                                   | English Text                                                                | UI Type          | Notes                  |
| ----------------------------------------------- | --------------------------------------------------------------------------- | ---------------- | ---------------------- |
| `portal.team.invite.title`                      | "Invite Team Member"                                                        | Page heading     | Also `<title>`         |
| `portal.team.invite.subtitle`                   | "Add a new member to your organisation."                                    | Subtitle         | British "organisation" |
| `portal.team.invite.field.first_name`           | "First Name \*"                                                             | Form label       |                        |
| `portal.team.invite.field.last_name`            | "Last Name \*"                                                              | Form label       |                        |
| `portal.team.invite.field.email`                | "Email Address \*"                                                          | Form label       |                        |
| `portal.team.invite.field.password`             | "Temporary Password \*"                                                     | Form label       |                        |
| `portal.team.invite.field.password_placeholder` | "Min 12 characters"                                                         | Placeholder      |                        |
| `portal.team.invite.field.password_hint`        | "Share this with the new member — they should change it after first login." | Helper text      |                        |
| `portal.team.invite.field.role`                 | "Role \*"                                                                   | Form label       |                        |
| `portal.team.invite.role.orderer`               | "Orderer — can place and cancel orders"                                     | Select option    |                        |
| `portal.team.invite.role.viewer`                | "Viewer — read-only access"                                                 | Select option    |                        |
| `portal.team.invite.role.admin`                 | "Admin — full team management access"                                       | Select option    |                        |
| `portal.team.invite.submit`                     | "Create Member"                                                             | Button           |                        |
| `portal.team.invite.creating`                   | "Creating…"                                                                 | Button (loading) |                        |
| `portal.team.invite.cancel`                     | "Cancel"                                                                    | Link             |                        |
| `portal.team.invite.error.default`              | "Failed to create team member. Please try again."                           | Error            |                        |

#### Team User Detail & Actions

| Suggested Key                              | English Text                                            | UI Type          | Notes                     |
| ------------------------------------------ | ------------------------------------------------------- | ---------------- | ------------------------- |
| `portal.team.user.title`                   | "{firstName} {lastName}{self}"                          | Page heading     | Appends " (you)" for self |
| `portal.team.user.field.email`             | "Email"                                                 | Detail label     |                           |
| `portal.team.user.field.role`              | "Role"                                                  | Detail label     |                           |
| `portal.team.user.field.status`            | "Status"                                                | Detail label     |                           |
| `portal.team.user.field.member_since`      | "Member since"                                          | Detail label     |                           |
| `portal.team.user.field.last_login`        | "Last login"                                            | Detail label     |                           |
| `portal.team.user.actions.change_role`     | "Change Role"                                           | Section heading  |                           |
| `portal.team.user.actions.account_status`  | "Account Status"                                        | Section heading  |                           |
| `portal.team.user.actions.deactivate_hint` | "Deactivating removes the member's access immediately." | Help text        |                           |
| `portal.team.user.actions.reactivate_hint` | "Reactivating restores the member's access."            | Help text        |                           |
| `portal.team.user.actions.deactivate`      | "Deactivate Member"                                     | Button           |                           |
| `portal.team.user.actions.reactivate`      | "Reactivate Member"                                     | Button           |                           |
| `portal.team.user.actions.saving`          | "Saving…"                                               | Button (loading) |                           |
| `portal.team.user.success.role_updated`    | "Role updated."                                         | Success message  |                           |
| `portal.team.user.success.deactivated`     | "User deactivated."                                     | Success message  |                           |
| `portal.team.user.success.reactivated`     | "User reactivated."                                     | Success message  |                           |
| `portal.team.user.error.role`              | "Failed to update role."                                | Error            |                           |
| `portal.team.user.error.status`            | "Failed to update user status."                         | Error            |                           |

---

### 6.18 Validation & Error Messages (API)

These originate from the NestJS backend and reach the UI via the `useApiAction` hook's error display or inline form error `<p>` elements.

| Suggested Key                        | Source text                                                                       | Source file                | Context                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `api.error.invalid_transition`       | "Invalid {entity}transition: {from} → {to}"                                       | `domain.errors.ts`         | State machine guard — shown in red error box on action panels            |
| `api.error.transition_guard`         | "{reason}" (dynamic)                                                              | `domain.errors.ts`         | Specific guard rejection message — context-dependent                     |
| `api.error.port_not_available`       | "Port {portId} is not available for reservation (current state: {state})"         | `domain.errors.ts`         | Shown when a port cannot be reserved                                     |
| `api.error.port_conflict`            | "Port {portId} was claimed by a concurrent request. Retry with a different port." | `domain.errors.ts`         | Concurrency conflict                                                     |
| `api.error.insufficient_role`        | "Action requires role: {roles} (has: {role})"                                     | `domain.errors.ts`         | RBAC guard — typically should not reach end users but may via API calls  |
| `api.error.missing_data`             | "{field} is required to perform this transition"                                  | `domain.errors.ts`         | Missing required field for a state transition                            |
| `api.error.invalid_credentials`      | "Invalid email or password"                                                       | `login-form.tsx`           | Frontend-only — auth form                                                |
| `api.error.refresh_invalid`          | "Invalid or expired refresh token"                                                | `auth.service.ts`          | May surface on silent re-auth failure                                    |
| `api.error.user_not_found`           | "User not found"                                                                  | `auth.service.ts`          |                                                                          |
| `api.error.org_code_conflict`        | "Organization code '{code}' already in use"                                       | `organizations.service.ts` | Shown in new org form error                                              |
| `api.error.email_conflict`           | "Email '{email}' already registered"                                              | `organizations.service.ts` | Shown in add-user form error                                             |
| `api.error.site_code_conflict`       | "Site code '{code}' already in use"                                               | `locations.service.ts`     |                                                                          |
| `api.error.building_code_conflict`   | "Building code '{code}' already exists in this site"                              | `locations.service.ts`     |                                                                          |
| `api.error.room_code_conflict`       | "Room code '{code}' already exists in this building"                              | `locations.service.ts`     |                                                                          |
| `api.error.port_label_conflict`      | "Port label '{label}' already exists on this panel"                               | `locations.service.ts`     |                                                                          |
| `api.error.access_denied`            | "Access denied"                                                                   | Multiple services          | Generic 403 — should not reach UI if RBAC works; but edge cases possible |
| `api.error.document_not_found`       | "Document not found"                                                              | `documents.service.ts`     |                                                                          |
| `api.error.file_too_large`           | "File exceeds maximum allowed size of 50 MB"                                      | `documents.service.ts`     |                                                                          |
| `api.error.file_type_invalid`        | (dynamic from `documents.service.ts` L44)                                         | `documents.service.ts`     | Exact text not seen in read; needs verification                          |
| `api.error.cable_path_conflict`      | "Service already has an active {pathRole} cable path"                             | `topology.service.ts`      |                                                                          |
| `api.error.duplicate_port_in_path`   | "The same port cannot appear twice in a cable path"                               | `topology.service.ts`      |                                                                          |
| `api.error.approval_not_decidable`   | "Approval is not in a decidable state (current: {state})"                         | `approvals.service.ts`     |                                                                          |
| `api.error.wo_cannot_assign`         | "Work order in state '{state}' cannot be assigned"                                | `work-orders.service.ts`   |                                                                          |
| `api.error.wo_cannot_cancel`         | "Work order cannot be cancelled from state '{state}'"                             | `work-orders.service.ts`   |                                                                          |
| `api.error.service_not_permanent`    | "Cannot extend a permanent cross-connect service"                                 | `services.service.ts`      |                                                                          |
| `api.error.service_wrong_state`      | "Cannot extend service in state '{state}'"                                        | `services.service.ts`      |                                                                          |
| `api.error.no_authenticated_user`    | "No authenticated user"                                                           | `roles.guard.ts`           | Guard-level — should not reach UI normally                               |
| `api.error.insufficient_permissions` | "Insufficient permissions"                                                        | `roles.guard.ts`           | Guard-level                                                              |
| `api.error.request_failed`           | "Request failed"                                                                  | `use-api-action.ts`        | Generic fallback in hook                                                 |
| `api.error.label_failed`             | "{label} failed"                                                                  | `use-api-action.ts`        | Uses operation label as prefix — e.g. "Suspend failed"                   |

**Note on hardcoded fallback defaults sent server-side:**  
These strings are sent as API defaults when users don't fill in reason fields, and they appear in audit trail `diff` objects:

- `"Suspended by operator"` — `service-actions.tsx` default reason
- `"Disconnect requested"` — `service-actions.tsx` default reason
- `"Provisioning aborted"` — `service-actions.tsx` default reason

These strings end up stored in the database in the `disconnectReason` / `suspendedReason` fields. If those fields are displayed to customers, they need localisation.

---

## 7. Duplicate / Near-Duplicate Strings

| Text A                                    | Text B                                         | Locations                                                                | Recommended canonical wording                                                              |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| "Approvals Queue" (nav)                   | "Work Queue" (page title)                      | `(operator)/layout.tsx` vs `approvals/page.tsx`                          | Pick one — recommend "Approvals Queue"                                                     |
| "Order Timeline"                          | "Status Timeline"                              | `operator/orders/[id]/page.tsx` vs `portal/orders/[id]/page.tsx`         | "Order Timeline" in both                                                                   |
| "Organisation Name"                       | "Organization Name"                            | `edit-form.tsx` vs `new-org-form.tsx`                                    | Use "Organization Name" throughout                                                         |
| "Organisation" (label)                    | "Organization" (label)                         | `service detail`, `customer service detail`, `org detail`                | Standardize on "Organization"                                                              |
| "Requesting Organisation"                 | "Requesting Organization"                      | Service detail section heading vs org detail field label                 | Standardize on "Organization"                                                              |
| "Request Cross-Connect" (nav)             | "Request New" (button on customer orders page) | `(customer)/layout.tsx` vs `portal/orders/page.tsx`                      | Align — "Request New" is too vague; use "Request Cross-Connect" for both                   |
| "Request New"                             | "Request Cross-Connect"                        | See above                                                                |                                                                                            |
| "Active Services"                         | "Active Services"                              | Operator nav, operator page heading, customer nav, customer page heading | Consistent — no change needed                                                              |
| "A-Side (Your Equipment)"                 | "A-Side (Source)"                              | Customer new-order form vs operator new-order form                       | Acceptable difference — customer uses plain-English framing                                |
| "Z-Side (Remote / Carrier)"               | "Z-Side (Destination)"                         | Customer new-order form vs operator new-order form                       | Same                                                                                       |
| "SMF (Single-Mode Fibre)"                 | "SMF (Single-mode Fibre)"                      | Customer form vs operator form                                           | "Single-Mode" vs "Single-mode" — standardize casing                                        |
| "CAT6 (Copper)"                           | "Cat6 Copper"                                  | Customer form vs operator form                                           | Pick one: "CAT6 (Copper)" is more conventional                                             |
| "Customer Admin"                          | "Admin — full team management access"          | `add-user-form.tsx` vs `invite-form.tsx`                                 | Two display styles for same role; keep short form for badges, long form for select options |
| "Customer Orderer"                        | "Orderer — can place and cancel orders"        | Same as above                                                            |                                                                                            |
| "Customer Viewer"                         | "Viewer — read-only access"                    | Same as above                                                            |                                                                                            |
| "Confirm" (generic)                       | "Confirm" (per-action)                         | All confirm panels                                                       | Single key `shared.action.confirm`                                                         |
| "Back"                                    | "Back"                                         | All action panels                                                        | Single key `shared.action.back`                                                            |
| "Cancel"                                  | "Cancel"                                       | Forms, action panels                                                     | Single key `shared.action.cancel`                                                          |
| "Saving…"                                 | "Saving..."                                    | `new-org-form.tsx` (three dots) vs `edit-form.tsx` (ellipsis)            | Use actual ellipsis character `…` throughout                                               |
| "Deactivating…" (user)                    | "Deactivating…" (org)                          | `deactivate-buttons.tsx` (org) vs `deactivate-buttons.tsx` (user)        | Same string — share                                                                        |
| "Failed to deactivate. Please try again." | "Failed to remove access. Please try again."   | Operator deactivate vs customer remove-access                            | Slightly different context; consider separate keys                                         |

---

## 8. Ambiguous Strings Requiring Human Review

| Source text                | Location                                         | Why ambiguous                                                          | What clarification is needed                             |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| "Orders" (nav)             | Operator sidebar                                 | Could mean "cross-connect orders" or orders in general                 | Translate as クロスコネクト注文 or simply 注文/オーダー? |
| "Services" (nav)           | Operator sidebar                                 | Very broad — means cross-connect services specifically                 | サービス is fine but contextual disambiguation may help  |
| "Type" (column/label)      | Orders, Services, Work Orders                    | Refers to serviceType, mediaType, or woType depending on context       | Separate keys per context recommended                    |
| "Media" (column)           | Orders list, approvals                           | Short for media type (SMF/MMF/etc.)                                    | メディア or 媒体種別?                                    |
| "State" (column)           | All tables                                       | Could be "status" or "state" in Japanese                               | 状態 is standard                                         |
| "Code" (org field)         | Organizations                                    | Organization code (short alphanumeric identifier)                      | コード or 組織コード?                                    |
| "Temporary"                | Orders, Services                                 | Means "temporary cross-connect" not "temporary issue"                  | 一時的 — needs consistent use                            |
| "Exchange"                 | Service type + org type + media type potentially | Appears as service type value and org type value                       | Different Japanese terms may apply per context           |
| "Internal" (endpoint type) | New order form                                   | Could mean internal org endpoint or internal network — context unclear | Clarify with product team before translating             |
| "Pending" (billing badge)  | Billing events                                   | "Pending export" vs "pending" in order states                          | 未出力 / エクスポート待ち for billing context            |
| "Demarc"                   | Multiple forms                                   | Industry-specific abbreviation; may be unknown to Japanese customers   | Add tooltip / translate as 分界点                        |
| "LOA Number"               | New order form customer                          | Some DC operators use non-English LOA terminology                      | Verify if LOA番号 is understood by target users          |
| "CFA Number"               | New order form customer                          | Data centres in Japan may use different terminology                    | Verify with domain expert                                |
| "Strand" (inventory)       | Inventory port table                             | TX/RX strand designation — fibre-specific                              | ストランド is acceptable but needs glossary entry        |
| "Cloud On-Ramp"            | Endpoint type                                    | AWS/Azure term — not universally known                                 | クラウドオンランプ or 直接接続 (Direct Connect)?         |
| "Speed"                    | Orders detail/form                               | Physical speed in Gbps                                                 | 速度 or 帯域幅?                                          |
| "Audit Check" (WO type)    | Work order type                                  | Could mean an audit/inspection work order                              | 監査点検 — verify with ops team                          |
| "path role"                | Cable path badge                                 | "primary path" vs "diverse path"                                       | 主経路 / 冗長経路 — confirm with network engineers       |

---

## 9. Hardcoded / Problematic Localization Patterns

### 9.1 Raw enum value rendering (highest priority)

All status badge components use `.replace(/_/g, ' ')` to produce display text from enum values:

```tsx
// status-badge.tsx — affects ALL enum badges
{
  state.replace(/_/g, ' ');
}

// Also in order list, service list, work order list:
{
  order.serviceType.replace(/_/g, ' ');
}
{
  wo.woType.replace(/_/g, ' ');
}
{
  order.mediaType.toUpperCase();
} // media shown uppercase but untranslated

// Sidebar user role display:
user?.role?.replace(/_/g, ' ');
```

**Fix needed:** Create a lookup map (e.g. `STATE_DISPLAY_MAP`) for each enum and localise through that map.

### 9.2 Hardcoded English pluralization

```tsx
// dashboard/page.tsx
`${pendingApprovals.length} order${meta.total !== 1 ? 's' : ''}`
// approvals/page.tsx
`${queue.length} order${queue.length !== 1 ? 's' : ''} needing attention`
// billing/page.tsx
`${events.length} pending export${events.length !== 1 ? 's' : ''}`
// customer portal team
`${users.length} member${users.length !== 1 ? 's' : ''}`;
```

**Fix needed:** Japanese has no pluralisation. These should use i18n plural rules (e.g. `t('orders.count', { count: n })`).

### 9.3 String concatenation in JSX (broken for Japanese)

```tsx
// customer portal home — empty state table cell
<>No orders yet — <Link>request your first cross-connect</Link></>

// customer order detail — approved banner
<>Service <Link>{svc.serviceNumber}</Link> is being provisioned. You can track it in <Link>Active Services</Link>.</>

// operator inventory — availability
<><span>{available}</span><span> / {total} available</span></>

// operator org detail — cross-connect orders
<>View all orders for this organization via <Link>the orders list</Link>.</>
```

**Fix needed:** All sentences with embedded links must be converted to i18n messages with slot/component interpolation (e.g. `<Trans>` in react-i18next).

### 9.4 Dynamic subtitle composition without i18n

```tsx
// operator layout sidebar userLine2
user?.orgName
  ? `${user.orgName} · ${user?.role?.replace(/_/g, ' ')}`
  : user?.role?.replace(/_/g, ' ');
```

The "·" separator and role display both need translation-aware handling.

### 9.5 Audit log action strings rendered raw

```tsx
// operator orders/[id]/page.tsx
<p className="font-mono text-xs text-gray-700">{evt.action}</p>

// work-orders/[id]/page.tsx
<span className="font-medium">{ev.action}</span>
```

Values like `workorder.created`, `order.approved`, `service.disconnect_requested` are rendered directly. A display-name map keyed on action string is needed.

### 9.6 Cable path state rendered raw

```tsx
// cable-path-management.tsx and work-orders/[id]/page.tsx
{
  path.state;
} // e.g. "planned", "installed", "active"
{
  wo.cablePath.state;
} // e.g. "planned"
```

These do not go through the badge component, so `.replace(/_/g, ' ')` is not even applied.

### 9.7 USD currency format

```tsx
// billing/page.tsx
{
  ev.mrcCents != null ? `$${(ev.mrcCents / 100).toFixed(2)}` : '—';
}
```

Hardcoded `$` symbol before value. Use `Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'USD' })` or a utility.

### 9.8 Date/time without forced locale

```tsx
// Multiple components
new Date(order.createdAt).toLocaleString();
new Date(order.createdAt).toLocaleDateString();
```

Without a locale argument, this uses the browser's locale. Pass `'ja-JP'` explicitly or use a date formatting library.

### 9.9 API default reason strings (stored in DB)

```tsx
// service-actions.tsx
reason: reason || 'Suspended by operator'; // sent to API
reason: reason || 'Disconnect requested'; // sent to API
reason: reason || 'Provisioning aborted'; // sent to API
```

These English strings are used as fallback values that enter the database. If shown in audit or customer-facing views, they will appear in English.

### 9.10 `<title>` metadata inconsistencies

Several pages export static `metadata.title` values:

- "Login" → should be consistent with brand name if used standalone
- "Dashboard", "Orders", "Approvals" — metadata titles are English-only; if SEO matters for Japanese, these need localisation via Next.js i18n metadata API

---

## 10. Recommended Translation Order

### Phase 1 — Glossary (prerequisite for everything else)

Resolve all terms in Section 2 before any translation begins. Key decisions:

- "Cross-Connect" rendering in Japanese (katakana vs translation)
- "A-Side / Z-Side" notation
- "Demarc", "LOA", "CFA" equivalents
- Role names (short form for badges, long form for select options)
- Choose one spelling: Organization vs Organisation

### Phase 2 — Shared / Common UI

Translate shared components that appear on every page:

- Sidebar labels (nav items, Sign out, portal subtitles)
- Error page messages
- Pagination strings (Prev, Next, Showing N of M)
- Shared action labels (Cancel, Back, Confirm, Search, Filter, Clear)
- Status badges (all enum display maps)

### Phase 3 — Status & Action Labels

Translate all enum display maps and action button labels before translating pages, since they are reused across all modules:

- All state badge display maps (order, service, work order, port, path)
- All action button strings (submit, approve, reject, cancel, assign, etc.)
- Role label display maps (all six roles, consistent across both portals)

### Phase 4 — Core Workflow Pages (highest user impact)

Translate in this order based on usage frequency:

1. Customer Portal home + New Order form (most customer-facing)
2. Customer Orders list + Order detail
3. Customer Services list + Service detail
4. Operator Orders list + Order detail + actions
5. Operator Approvals queue
6. Operator Work Orders list + detail + actions

### Phase 5 — Management Pages

1. Organizations list + detail + new/edit forms + add user form
2. Customer Team + invite form + user detail
3. Operator Services + service actions

### Phase 6 — Operational / Technical Pages

These pages are primarily operator-only and have higher domain-specific terminology density:

1. Inventory (port/panel data)
2. Locations
3. Billing Events
4. Audit Log

### Phase 7 — Validation & API Error Messages

Translate all API error message strings after Phase 3. These require glossary-consistency with the UI terms established in earlier phases. Also fix hardcoded default reason strings.

---

_End of localization inventory — 2026-03-27_
