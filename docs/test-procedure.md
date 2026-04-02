# CrossConnect Platform — Test Procedure

**Application URL:** http://localhost:3210  
**Test Date:** ****\_\_\_****  
**Tested By:** ****\_\_\_****

## Test Accounts

| Role                      | Email                                  | Password       | Portal               |
| ------------------------- | -------------------------------------- | -------------- | -------------------- |
| Super Admin / Ops Manager | `admin@crossconnect.local`             | `changeme123!` | Operator (`/`)       |
| Customer User             | _(create one via Organizations first)_ | —              | Customer (`/portal`) |

---

## Legend

- [ ] **PASS** — Result matches expected
- [ ] **FAIL** — Record actual result and any error messages

---

## Section 1 — Authentication

### 1.1 Login

| #     | Step                                                   | Expected Result                                      | Pass/Fail |
| ----- | ------------------------------------------------------ | ---------------------------------------------------- | --------- |
| 1.1.1 | Navigate to http://localhost:3210                      | Redirects to `/login`                                |           |
| 1.1.2 | Submit form with blank email and password              | Validation error shown; form does not submit         |           |
| 1.1.3 | Submit form with wrong password                        | "Invalid credentials" or similar error message shown |           |
| 1.1.4 | Login with `admin@crossconnect.local` / `changeme123!` | Redirects to operator dashboard (`/`)                |           |
| 1.1.5 | Confirm page title shows "Dashboard"                   | Dashboard page loads with KPI cards                  |           |

### 1.2 Logout

| #     | Step                                      | Expected Result                    | Pass/Fail |
| ----- | ----------------------------------------- | ---------------------------------- | --------- |
| 1.2.1 | Click the user avatar/name in the sidebar | User menu or logout option visible |           |
| 1.2.2 | Click "Sign out"                          | Redirected to `/login` page        |           |
| 1.2.3 | Navigate to `/` without logging in        | Redirected back to `/login`        |           |

---

## Section 2 — Operator Dashboard

### 2.1 Dashboard Overview

| #     | Step                                                | Expected Result                                                                         | Pass/Fail |
| ----- | --------------------------------------------------- | --------------------------------------------------------------------------------------- | --------- |
| 2.1.1 | Log in as admin; view Dashboard                     | KPI cards shown: Pending Approvals, Active Services, Open Work Orders, Orders This Week |           |
| 2.1.2 | Click "Pending Approvals" KPI card                  | Navigates to `/approvals`                                                               |           |
| 2.1.3 | Click "Active Services" KPI card                    | Navigates to `/services?state=active`                                                   |           |
| 2.1.4 | Confirm recent orders table renders (even if empty) | No page crash; empty state OR orders listed                                             |           |

---

## Section 3 — Organizations

### 3.1 List Organizations

| #     | Step                                                   | Expected Result                                   | Pass/Fail |
| ----- | ------------------------------------------------------ | ------------------------------------------------- | --------- |
| 3.1.1 | Navigate to `/organizations`                           | Organizations list page loads                     |           |
| 3.1.2 | Filter by type "Customer"                              | Only customer orgs shown (or empty state if none) |           |
| 3.1.3 | Enter a search term in the search box and click Filter | List filters by name/code                         |           |
| 3.1.4 | Clear filters                                          | Full list restored                                |           |

### 3.2 Create Organization

| #     | Step                                                                               | Expected Result                                    | Pass/Fail |
| ----- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | --------- |
| 3.2.1 | Click "+ New Organization"                                                         | Navigates to `/organizations/new`                  |           |
| 3.2.2 | Submit empty form                                                                  | Required field validation errors shown             |           |
| 3.2.3 | Fill in: Name = "Test Customer Co", Code = "TESTCO", Type = "customer" then submit | Organization created; redirected to list or detail |           |
| 3.2.4 | Verify "TESTCO" appears in the organizations list                                  | Entry visible with correct type badge              |           |

---

## Section 4 — Location Management

### 4.1 Site (Datacenter) Management

| #     | Step                                                                                                            | Expected Result                            | Pass/Fail |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------- |
| 4.1.1 | Navigate to `/locations`                                                                                        | Site list page loads; shows existing sites |           |
| 4.1.2 | Click "+ Add Site" button                                                                                       | Navigates to `/locations/new`              |           |
| 4.1.3 | Submit empty form                                                                                               | Required field errors shown                |           |
| 4.1.4 | Fill in Name = "Test DC", Code = "TESTDC", Address = "1 Test St", City = "New York", Country = "US" then submit | Site created; redirected to site list      |           |
| 4.1.5 | Verify "TESTDC" appears in the site list                                                                        | Site card shows with buildings count = 0   |           |

### 4.2 Site Detail

| #     | Step                                                          | Expected Result                        | Pass/Fail |
| ----- | ------------------------------------------------------------- | -------------------------------------- | --------- |
| 4.2.1 | Click on the newly created "Test DC" site                     | Site detail page loads with site info  |           |
| 4.2.2 | Confirm "Site Information" panel shows Address, City, Country | Correct data displayed                 |           |
| 4.2.3 | Confirm "Buildings (0)" section shows empty state             | "No buildings added yet" message shown |           |
| 4.2.4 | Click "Site Availability" button                              | Navigates to `/inventory?siteId=...`   |           |

### 4.3 Building Creation

| #     | Step                                                                     | Expected Result                             | Pass/Fail |
| ----- | ------------------------------------------------------------------------ | ------------------------------------------- | --------- |
| 4.3.1 | From site detail, click "+ Add building"                                 | Navigates to `buildings/new` form           |           |
| 4.3.2 | Submit empty form                                                        | Validation errors shown                     |           |
| 4.3.3 | Fill in Name = "Main Building", Code = "BLDG-A", Floors = 3, then submit | Building created; redirected to site detail |           |
| 4.3.4 | Verify "BLDG-A" appears in the buildings list on site detail             | Building card visible with room count       |           |
| 4.3.5 | Click "Manage ->" on the building card                                   | Navigates to building detail page           |           |

### 4.4 Building Detail

| #     | Step                      | Expected Result                    | Pass/Fail |
| ----- | ------------------------- | ---------------------------------- | --------- |
| 4.4.1 | View building detail page | Shows "Rooms" table or empty state |           |
| 4.4.2 | Click "+ Add Room"        | Navigates to `rooms/new` form      |           |

### 4.5 Room Creation

| #     | Step                                                                    | Expected Result                             | Pass/Fail |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------- | --------- |
| 4.5.1 | Submit empty room form                                                  | Validation errors for Name and Code         |           |
| 4.5.2 | Fill in Name = "Main MMR", Code = "MMR-01", Type = "mmr" then submit    | Room created; redirected to building detail |           |
| 4.5.3 | Verify breadcrumb shows: Locations > Test DC > Main Building > Add Room | Correct breadcrumb trail                    |           |
| 4.5.4 | Verify "MMR-01" appears in the building's rooms table                   | Room listed with "mmr" badge                |           |
| 4.5.5 | Click "Manage ->" on the MMR-01 room row                                | Navigates to room detail page               |           |

### 4.6 Room Detail

| #     | Step                                                         | Expected Result                               | Pass/Fail |
| ----- | ------------------------------------------------------------ | --------------------------------------------- | --------- |
| 4.6.1 | View room detail page                                        | Shows Cages section and Room Panels section   |           |
| 4.6.2 | Confirm both sections show empty state initially             | "No cages yet" and "No room-level panels yet" |           |
| 4.6.3 | Confirm "Port Inventory ->" button is visible in page header | Link present                                  |           |

### 4.7 Cage Creation

| #     | Step                                                        | Expected Result                                | Pass/Fail |
| ----- | ----------------------------------------------------------- | ---------------------------------------------- | --------- |
| 4.7.1 | From room detail, click "+ Add Cage"                        | Navigates to `cages/new` form                  |           |
| 4.7.2 | Submit empty form                                           | Validation errors shown                        |           |
| 4.7.3 | Fill in Name = "Cage A", Code = "CGE-A", then submit        | Cage created; redirected to room detail        |           |
| 4.7.4 | Verify "Cage A" appears in the Cages section of room detail | Cage card visible with "No racks in this cage" |           |

### 4.8 Rack Creation

| #     | Step                                                                | Expected Result                                  | Pass/Fail |
| ----- | ------------------------------------------------------------------- | ------------------------------------------------ | --------- |
| 4.8.1 | From room detail, click "+ Add Rack" inside the Cage A card         | Navigates to `racks/new` form                    |           |
| 4.8.2 | Fill in Name = "Rack 01", Code = "RK-01", U Size = 42, then submit  | Rack created; redirected to room detail          |           |
| 4.8.3 | Verify "RK-01" appears under Cage A in the room detail              | Rack row shows with "42U" and "+ Add Panel" link |           |
| 4.8.4 | Create a second rack: Name = "Rack 02", Code = "RK-02", U Size = 48 | Second rack visible under Cage A                 |           |

### 4.9 Rack Panel Creation

| #     | Step                                                                                                               | Expected Result                                       | Pass/Fail |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------- |
| 4.9.1 | Click "+ Add Panel" for Rack 01                                                                                    | Navigates to `racks/[rackId]/panels/new` form         |           |
| 4.9.2 | Submit empty form                                                                                                  | Validation errors shown                               |           |
| 4.9.3 | Fill in: Name = "PP-01", Code = "PP-01", Type = "patch_panel", Port Count = 48, U Position = 1                     | Form accepts all fields                               |           |
| 4.9.4 | In the "Auto-provision ports now" section, select Media = "smf", Connector = "lc", leave Alternate TX/RX unchecked | Fields visible and selectable                         |           |
| 4.9.5 | Submit the form                                                                                                    | Panel created; redirected to room detail              |           |
| 4.9.6 | Verify the panel now appears under RK-01 rack — check via Inventory view                                           | Ports should be visible in inventory                  |           |
| 4.9.7 | Repeat test but UNCHECK "Auto-provision ports now"                                                                 | Panel created with 0 ports; no port rows in inventory |           |

### 4.10 Room Panel Creation

| #      | Step                                                                               | Expected Result                              | Pass/Fail |
| ------ | ---------------------------------------------------------------------------------- | -------------------------------------------- | --------- |
| 4.10.1 | From room detail, click "+ Add Panel" in Room Panels section                       | Navigates to `panels/new` form               |           |
| 4.10.2 | Fill in: Name = "ODF Frame 1", Code = "ODF-F1", Type = "odf", Port Count = 24      | Form accepts inputs                          |           |
| 4.10.3 | Enable "Auto-provision ports now", set Media = "smf", Connector = "lc" then submit | Panel created; redirected to room detail     |           |
| 4.10.4 | Verify "ODF Frame 1" appears in the Room Panels table on room detail               | Panel listed with 24 port count              |           |
| 4.10.5 | Click "Inventory ->" next to the panel                                             | Navigates to inventory view filtered by room |           |

---

## Section 5 — Port Inventory

### 5.1 Inventory View

| #     | Step                                                                                           | Expected Result                           | Pass/Fail |
| ----- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- | --------- |
| 5.1.1 | Navigate to `/inventory`                                                                       | Inventory page loads with site picker     |           |
| 5.1.2 | Select "Test DC" from the site dropdown                                                        | Page reloads with inventory for that site |           |
| 5.1.3 | Confirm panels from the location hierarchy are visible                                         | Panel sections appear with port tables    |           |
| 5.1.4 | Verify a panel created WITH auto-provision shows port rows with label, media, connector, state | Port rows visible, state = "available"    |           |
| 5.1.5 | Verify a panel created WITHOUT auto-provision shows "No ports provisioned"                     | Empty state message shown                 |           |
| 5.1.6 | Navigate to `/inventory?roomId={id}` directly                                                  | Inventory scoped to that room only        |           |

---

## Section 6 — Cross-Connect Orders (Operator)

### 6.1 Create New Order

| #     | Step                                                                                                                             | Expected Result                                            | Pass/Fail |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------- |
| 6.1.1 | Navigate to `/orders`                                                                                                            | Orders list loads                                          |           |
| 6.1.2 | Click "+ New Order"                                                                                                              | Navigates to `/orders/new`                                 |           |
| 6.1.3 | Submit empty form                                                                                                                | Required field validation errors                           |           |
| 6.1.4 | Fill in all required fields: Requesting Org, Service Type = "cross_connect", Media Type = "smf", A-Side Location/Panel/Port info | Form accepts inputs                                        |           |
| 6.1.5 | Submit form                                                                                                                      | Order created in "draft" state; redirected to order detail |           |
| 6.1.6 | Confirm order detail shows "Order Number", state badge = "draft", and all submitted data                                         | Detail page loads correctly                                |           |

### 6.2 Order Lifecycle — Full Workflow

| #     | Step                                                                 | Expected Result                                                      | Pass/Fail |
| ----- | -------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| 6.2.1 | On a draft order, click "Submit for Review"                          | State changes to "submitted"; audit timeline shows "Submitted" event |           |
| 6.2.2 | Click "Start Feasibility Review"                                     | State changes to "under_review"                                      |           |
| 6.2.3 | Click "Confirm Feasibility"; enter feasibility notes and confirm     | State changes to "pending_approval"                                  |           |
| 6.2.4 | Click "Approve"; enter approval notes and confirm                    | State changes to "approved"                                          |           |
| 6.2.5 | Confirm audit timeline on order detail shows all 4 state transitions | All events listed with timestamps and actor names                    |           |
| 6.2.6 | Confirm service is created after approval (check Services page)      | Service record visible in "provisioning" or "active" state           |           |

### 6.3 Order Rejection Flow

| #     | Step                                                                            | Expected Result                                        | Pass/Fail |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------ | --------- |
| 6.3.1 | Create a new order and advance it to "pending_approval" state                   | Order in pending_approval state                        |           |
| 6.3.2 | Click "Reject"; enter a rejection reason and confirm                            | State changes to "rejected"; reason shown in audit log |           |
| 6.3.3 | Confirm no further action buttons are shown on a rejected order (except Cancel) | Only "Cancel" visible                                  |           |

### 6.4 Order Cancellation

| #     | Step                                                     | Expected Result              | Pass/Fail |
| ----- | -------------------------------------------------------- | ---------------------------- | --------- |
| 6.4.1 | Create a new draft order                                 | Order in draft state         |           |
| 6.4.2 | Click "Cancel"; enter a reason and confirm               | State changes to "cancelled" |           |
| 6.4.3 | Confirm no action buttons are shown on a cancelled order | No action buttons visible    |           |

### 6.5 Orders List Filters

| #     | Step                                        | Expected Result            | Pass/Fail |
| ----- | ------------------------------------------- | -------------------------- | --------- |
| 6.5.1 | Navigate to `/orders`                       | All orders listed          |           |
| 6.5.2 | Filter by state "draft"                     | Only draft orders shown    |           |
| 6.5.3 | Filter by state "approved"                  | Only approved orders shown |           |
| 6.5.4 | Enter an order number in the search box     | Matching order appears     |           |
| 6.5.5 | Use pagination if more than 25 orders exist | Next/Prev page works       |           |

---

## Section 7 — Work Queue / Approvals

### 7.1 Approvals Queue

| #     | Step                                                                                 | Expected Result                  | Pass/Fail |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------- | --------- |
| 7.1.1 | Navigate to `/approvals`                                                             | Work Queue page loads            |           |
| 7.1.2 | Confirm all orders in submitted, under_review and pending_approval states are listed | Orders grouped by state priority |           |
| 7.1.3 | Click an order number link                                                           | Navigates to order detail        |           |
| 7.1.4 | Create a new order and submit it; check it appears in the queue                      | Order visible in queue           |           |

---

## Section 8 — Work Orders

### 8.1 Work Order List

| #     | Step                                  | Expected Result                | Pass/Fail |
| ----- | ------------------------------------- | ------------------------------ | --------- |
| 8.1.1 | Navigate to `/work-orders`            | Work orders list loads         |           |
| 8.1.2 | Filter by state (e.g., "in_progress") | Results filtered appropriately |           |

### 8.2 Work Order Lifecycle

| #     | Step                                                                           | Expected Result                                    | Pass/Fail |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------- | --------- |
| 8.2.1 | From an approved order detail page, click "Create Work Order"                  | Work order created; navigated to work order detail |           |
| 8.2.2 | Confirm WO detail shows WO Number, state = "created", linked order reference   | Detail page renders correctly                      |           |
| 8.2.3 | Click "Assign" (or assign to technician if UI provides it)                     | State changes to "assigned"                        |           |
| 8.2.4 | Click "Start Work"                                                             | State changes to "in_progress"                     |           |
| 8.2.5 | Click "Mark Ready for Test"                                                    | State changes to "pending_test"                    |           |
| 8.2.6 | Click "Complete"                                                               | State changes to "completed"                       |           |
| 8.2.7 | Confirm work order timeline shows all state transitions                        | Timeline rendered with event labels and timestamps |           |
| 8.2.8 | Confirm linked service state updates after WO completion (check Services page) | Service state = "active"                           |           |

---

## Section 9 — Services

### 9.1 Service List

| #     | Step                     | Expected Result            | Pass/Fail |
| ----- | ------------------------ | -------------------------- | --------- |
| 9.1.1 | Navigate to `/services`  | Services list loads        |           |
| 9.1.2 | Filter by state "active" | Only active services shown |           |
| 9.1.3 | Search by service number | Matching service returned  |           |

### 9.2 Service Detail

| #     | Step                                                          | Expected Result                           | Pass/Fail |
| ----- | ------------------------------------------------------------- | ----------------------------------------- | --------- |
| 9.2.1 | Click a service from the list                                 | Service detail page loads                 |           |
| 9.2.2 | Confirm service number, state, service type, media type shown | All fields visible                        |           |
| 9.2.3 | Confirm link back to originating order is present             | "View Order" or order number link visible |           |

---

## Section 10 — Customer Portal

### 10.1 Customer Portal Access

| #      | Step                                                                    | Expected Result                     | Pass/Fail |
| ------ | ----------------------------------------------------------------------- | ----------------------------------- | --------- |
| 10.1.1 | Log in as a customer user (role = "customer")                           | Redirected to `/portal` not `/`     |           |
| 10.1.2 | Confirm portal dashboard shows "My Portal" heading                      | Correct portal layout shown         |           |
| 10.1.3 | Confirm KPI cards show: Active Services, Pending Requests, Total Orders | Summary cards visible               |           |
| 10.1.4 | Confirm recent orders table is rendered                                 | Orders table visible (may be empty) |           |

### 10.2 Customer Order Submission

| #      | Step                               | Expected Result                       | Pass/Fail |
| ------ | ---------------------------------- | ------------------------------------- | --------- |
| 10.2.1 | Click "Request Cross-Connect"      | Navigates to `/portal/orders/new`     |           |
| 10.2.2 | Submit empty form                  | Validation errors shown               |           |
| 10.2.3 | Fill in required fields and submit | Order created in "draft" state        |           |
| 10.2.4 | Navigate to `/portal/orders`       | New order appears in list             |           |
| 10.2.5 | Click on the order                 | Order detail shows with current state |           |

### 10.3 Customer Order Visibility

| #      | Step                                            | Expected Result                    | Pass/Fail |
| ------ | ----------------------------------------------- | ---------------------------------- | --------- |
| 10.3.1 | As customer, verify only own orders are visible | Cannot see other customers' orders |           |
| 10.3.2 | Filter orders by state                          | Filtering works correctly          |           |
| 10.3.3 | Navigate to `/portal/services`                  | Customer's active services listed  |           |

### 10.4 Customer Portal Restriction

| #      | Step                                               | Expected Result                           | Pass/Fail |
| ------ | -------------------------------------------------- | ----------------------------------------- | --------- |
| 10.4.1 | As customer, manually navigate to `/locations`     | Redirected away (403, /login, or /portal) |           |
| 10.4.2 | As customer, manually navigate to `/organizations` | Redirected away                           |           |
| 10.4.3 | As customer, manually navigate to `/approvals`     | Redirected away                           |           |

---

## Section 11 — Navigation & Breadcrumbs

### 11.1 Sidebar Navigation

| #      | Step                                                                                                              | Expected Result               | Pass/Fail |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------- |
| 11.1.1 | Click each sidebar item: Dashboard, Orders, Approvals, Work Orders, Services, Inventory, Locations, Organizations | Each page loads without error |           |
| 11.1.2 | Active menu item is highlighted for current page                                                                  | Correct nav item highlighted  |           |

### 11.2 Breadcrumb Accuracy

| #      | Step                                   | Expected Result                                                                             | Pass/Fail |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------- | --------- |
| 11.2.1 | Navigate to a rack panel creation page | Breadcrumb shows all 6 levels: Locations > Site > Building > Room > Cage > Rack > Add Panel |           |
| 11.2.2 | Click each breadcrumb segment          | Navigates to correct parent page                                                            |           |

---

## Section 12 — Error Handling & Edge Cases

| #    | Step                                                                    | Expected Result                                           | Pass/Fail |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------- | --------- |
| 12.1 | Navigate to `/locations/nonexistent-id`                                 | 404 page shown (not a crash)                              |           |
| 12.2 | Attempt to create a site with a duplicate code                          | Error message "site code already in use" shown below form |           |
| 12.3 | Attempt to create a building with a duplicate code within the same site | Conflict error shown                                      |           |
| 12.4 | Attempt to create a room with a duplicate code within the same building | Conflict error shown                                      |           |
| 12.5 | Resize browser window to mobile width (~375px) on any page              | Layout does not overflow; sidebar collapses or scrolls    |           |
| 12.6 | Submit order creation form with a port count of 0                       | Validation error (min 1)                                  |           |
| 12.7 | Submit panel form with port count of 1001                               | Validation error (max 1000)                               |           |

---

## Section 13 — Regression Checks (Post-Fix Verification)

These specifically verify issues that were previously fixed.

| #    | Issue                              | Step                                       | Expected Result                                                 | Pass/Fail |
| ---- | ---------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | --------- |
| 13.1 | Panel not appearing after creation | Create a room panel; return to room detail | Panel visible in Room Panels table without page refresh         |           |
| 13.2 | Garbled em-dash character          | View site creation form                    | No garbled chars (e.g., `a€"` or `â€"`) anywhere on page        |           |
| 13.3 | Padding/layout fix                 | View any operator page at full width       | No content touching right edge; consistent padding on all pages |           |
| 13.4 | 500 on location creation           | Create a site with a duplicate code        | Form shows inline error, no browser 500 page                    |           |

---

## Notes / Issues Found

| #   | Page | Description | Severity |
| --- | ---- | ----------- | -------- |
|     |      |             |          |
|     |      |             |          |
|     |      |             |          |

---

_End of test procedure_
