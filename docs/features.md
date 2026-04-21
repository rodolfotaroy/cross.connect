# CrossConnect — Feature List

## Authentication

- Email / password login with JWT access + refresh tokens
- Session-aware middleware with role-based redirects
- Refresh token rotation & expiry handling

---

## Operator Portal

### Dashboard

- KPI cards: pending approvals, open work orders, active services
- Recent activity feed

### Orders

- List all orders (paginated, filter by state / organization)
- Create new order
- View order detail with endpoints and service link
- State transitions: Review → Feasibility → Approve / Reject
- Cancel order
- Upload documents (LOA, CFA, etc.)

### Approvals

- Approval queue (oldest-first)
- Approve / Reject / Defer decisions
- Step history per approval request

### Work Orders

- List work orders (filter by state / type)
- Create work order
- Assign to technician
- State transitions: Assign → Start → Pending Test → (Test Failed / Complete)
- Upload test results and photos
- Cancel work order

### Services

- List all services (paginated)
- View service detail with cable paths and endpoints
- Disconnect, Suspend, Resume, Abort Provisioning, Extend temporary service

### Inventory

- Port availability by site / room / panel
- Manually set port state: fault / maintenance / decommission
- Site-wide capacity summary

### Locations (Datacenter Hierarchy)

- Sites: Create, Edit, Deactivate
- Buildings: Create, Edit, Deactivate
- Rooms: Create, Edit, Deactivate (types: MMR, telco, standard)
- Cages: Create, Edit, Deactivate
- Racks: Create, Edit, Deactivate
- Panels: Create, Edit (rack-mount and direct-mount)
- Ports: Create (single and bulk), view by panel
- Demarc Points: Create customer / carrier handoff points
- MMR Topology view (panel + port + demarc tree)

### Cable Path (Topology)

- Plan cable path for a service (auto-reserves ports)
- Mark path as installed
- Activate path (ports → in_use, service → active)
- Initiate reroute
- Decommission path (releases port reservations)
- Segment types: patch, trunk, jumper, demarc extension

### Organizations

- List all organizations (search, filter by type, paginated)
- Create organization
- View organization detail
- Edit organization name / contact info
- Deactivate organization
- List users in organization
- Add user to organization
- Deactivate / Reactivate organization user

### Billing Events

- List unexported billing events
- Mark events as exported
- Event types: service activated, service disconnected, temporary extended, reroute completed

### Audit Log

- Paginated audit trail for all entities
- Filter by entity type, action, actor, date range

### Team Management (ops_manager / super_admin)

- List operator team members via Organizations
- Add operator user
- Edit user role
- Deactivate / Reactivate user

---

## Customer Portal

### Dashboard

- Active service count, order summaries, quick actions

### Orders

- List customer's own orders (paginated)
- Request new cross-connect order
- View order detail with state-aware banners
- Cancel order

### Services

- List active services (paginated)
- View service detail with cable paths and billing events
- Disconnect service

### Documents

- Upload documents to orders
- Download documents via presigned URL

---

## Service Partner (SP) Portal

### Dashboard

- Summary cards: total cross-connects, completed, in-progress, open tickets
- Financial summary (total MRC / NRC) — admin and report roles only
- Recent cross-connects table

### Cross-Connects

- List SP's cross-connects (paginated)
- Create new dedicated cross-connect
- View cross-connect detail
- Edit cross-connect
- Delete cross-connect (draft only)

### Reports (sp_admin / sp_report)

- Cross-connect summary report
- Financial summary (MRC / NRC totals)
- Status breakdown

### Support Tickets

- List support tickets (filter by status)
- Create new support ticket
- View ticket detail
- Add comments / update status

---

## Role-Based Access Control

| Role             | Portal   | Level                                                  |
| ---------------- | -------- | ------------------------------------------------------ |
| super_admin      | Operator | Full platform access                                   |
| ops_manager      | Operator | Orders, approvals, inventory, locations, organizations |
| ops_technician   | Operator | Execute work orders, update port states                |
| customer_admin   | Customer | Full customer access + team management                 |
| customer_orderer | Customer | Submit / cancel orders, disconnect services            |
| customer_viewer  | Customer | Read-only                                              |
| sp_admin         | SP       | Full SP access + team management                       |
| sp_ops           | SP       | Create and manage cross-connects                       |
| sp_viewer        | SP       | Read-only                                              |
| sp_report        | SP       | Read-only + reports and exports                        |
