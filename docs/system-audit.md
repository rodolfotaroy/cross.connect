# CrossConnect Platform — Technical Audit

> **Date:** April 2026  
> **Scope:** Full-stack review — architecture, security, state machines, data model, scalability, product gaps  
> **Codebase:** NestJS (modular monolith) + Next.js App Router + PostgreSQL + MinIO + pg-boss + Docker Compose

---

## Executive Summary — Top 10 Critical Findings

| #   | Finding                                                                                                                               | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | **Port reservation race condition** — concurrent `createCablePath` calls can double-reserve the same port                             | Critical |
| 2   | **Refresh tokens are stateless and unrevocable** — deactivated users retain API access for up to 7 days                               | Critical |
| 3   | **Single-node deployment with no HA** — entire stack on one machine at a hardcoded IP                                                 | High     |
| 4   | **MinIO credentials hardcoded** in `docker-compose.yml` (`minioadmin/minioadmin`)                                                     | High     |
| 5   | **No optimistic locking** — concurrent state transitions on the same entity silently overwrite each other                             | High     |
| 6   | **pg-boss shares the application database** — job queue contention degrades transactional throughput under load                       | Medium   |
| 7   | **Two disconnected cross-connect models** — `CrossConnectOrder/Service` and `DedicatedCrossConnect` — no unified reporting or billing | Medium   |
| 8   | **No notification layer** — order approvals, work order assignments, SLA breaches are entirely silent                                 | Medium   |
| 9   | **Billing integration is polling-only** — no webhook push, no idempotency guarantees, no retry envelope                               | Medium   |
| 10  | **No connection pooler** — PrismaClient opens connections directly; exhaustion risk at modest concurrency                             | Medium   |

---

## 1. Architecture Review

### Current Architecture

**Modular monolith** — NestJS with well-separated domain modules (`CrossConnectsModule`, `TopologyModule`, `InventoryModule`, etc.) all running in a single process. Frontend is Next.js App Router with SSR. Storage is MinIO (S3-compatible). Background jobs use pg-boss over the same PostgreSQL database.

This is the right choice at current scale. Microservices would add significant operational overhead without benefit. The module structure means future extraction is feasible.

### Findings

**Shared infrastructure debt**
pg-boss stores its job schema (`xc_jobs`) in the same PostgreSQL instance as the application. Under provisioning bursts (bulk work order completions, mass billing event writes), the job queue competes for the same connection pool and I/O budget as OLTP queries. Move pg-boss to its own PgBouncer pool or a separate logical database.

**No connection pooler**
`PrismaService` extends `PrismaClient` directly with no external connection pooler. PostgreSQL max connections default is 100. With API + job workers both hitting the same pool, a provisioning spike can exhaust it. Add PgBouncer in transaction-pool mode between the API container and PostgreSQL. This is a 30-minute change that eliminates a class of prod outages.

**CORS tied to a hardcoded IP**
`CORS_ORIGINS: https://172.16.100.69` is baked into `docker-compose.yml`. Every environment — staging, demo, customer-specific deployment — requires a file edit and redeploy. The `AppConfig` class already supports comma-separated origins; wire it through `.env` properly per environment.

**Self-signed TLS**
The `certgen` service generates a self-signed cert at startup. This kills any path to SaaS, external customers, or enterprise sales that require PKI validation. Swap for Let's Encrypt (cert-manager or Caddy) before customer-facing deployment.

---

## 2. Workflow & State Machine Analysis

The custom `StateMachine<S, TEntity>` engine is well-designed — generic, typed, guard-capable, testable. The lifecycle files are the right pattern.

### Missing States & Transitions

**Orders**

- `pending_approval` has no timeout/escalation path. An order can sit indefinitely with no automated SLA trigger.
- No `on_hold` state. Ops frequently needs to park an order pending external information (customer LOA not received, carrier delay) without rejecting it.
- No distinction between customer-cancelled and operator-cancelled. This matters for billing credit notes and reporting.

**Services**

- `pending_disconnect` → `disconnected` has no intermediate. When disconnection requires a work order (physical removal), the service should pass through `disconnecting` with a work order link before reaching `disconnected`.
- `suspended` has no maximum duration. A billing-suspended service that is never resumed silently accumulates an unbilled period.
- No `expired` terminal state for temporary services that pass their end date without extension.

**Work Orders**

- `test_failed` loops back to `in_progress` with no retry count. A work order can loop indefinitely. Add a `max_retries` field and an `escalated` state after N failures.
- No `on_hold` state for material shortage or access denied scenarios.

**Cable Paths**

- `rerouting` assumes a new `planned` path already exists, but this is not enforced by the guard. If `initiateReroute` is called without a new path, the service is left in an unresolvable state.

### Race Condition on Port Reservations — Critical

`createCablePath` reserves ports atomically within a Prisma transaction. However, the pattern is:

1. Read all requested port IDs, verify they are `available`
2. Update them to `reserved`

Two concurrent requests for the same port will both pass the availability check before either commits. PostgreSQL will serialize the writes, but both callers will believe they succeeded — resulting in double-reserved ports.

**Fix:** Add `SELECT ... FOR UPDATE` on the port rows before checking state, or use a `WHERE state = 'available'` predicate on the update and verify `count === expected`. With Prisma, use `$queryRaw` for the locking query.

### No Saga / Compensation

When `approveOrder` creates a `CrossConnectService` but a subsequent `AuditService.log()` call fails, the order state is advanced with no audit entry. When `activatePath` transitions ports to `in_use` and then the `BillingTriggerEvent` insert fails, the service is active with no billing record.

These side-effect chains need either:

- Wrapping all mutations in a single Prisma transaction, or
- Outbox pattern (write state change + side-effect record atomically, process asynchronously)

---

## 3. Data Modeling & Topology System

### Hierarchy Depth

The 7-level hierarchy (Site → Building → Room → Cage → Rack → Panel → Port) is correct for enterprise datacenters and matches DCIM industry conventions.

### Performance Risks

**MMR Topology query**
`GET /locations/rooms/:roomId/topology` returns the full panel+port+demarc tree. In a large MMR with 50 panels × 48 ports, this is 2,400 port objects in a single response with no pagination or depth limiting. This is the most likely first bottleneck in production.

**Site availability aggregation**
`GET /inventory/sites/:siteId/availability` aggregates port counts across the entire site without a precomputed cache. As inventory grows into tens of thousands of ports, this becomes a multi-second query.

**Recommendation:** Add a `PortSummaryCache` table (updated by trigger or pg-boss job on every port state change) storing precomputed counts by panel/room/site. This converts a full scan to a point lookup.

### Should This Use a Graph Database?

No — not yet. The cable path topology is a directed acyclic graph bounded to a single service's path. PostgreSQL with recursive CTEs handles this well at current scale. A graph DB would be warranted only if the product needs cross-service queries like "find all services traversing panel X" or "find the shortest available path between two endpoints" — not currently in scope.

### Dedicated vs Standard Model Split

`DedicatedCrossConnect` is a flat SP record. `CrossConnectOrder` + `CrossConnectService` is the structured workflow model. They share an `Organization` but have no join:

- A single organization appears in both models with no unified view
- Billing events only exist on `CrossConnectService`, not on `DedicatedCrossConnect`
- Platform-wide reporting requires two separate, incompatible queries

Add a `sourceType: 'standard' | 'dedicated'` discriminator to `BillingTriggerEvent` so both models feed the same billing pipeline.

---

## 4. Security & Access Control

### JWT / Refresh Token

**No token revocation**
When a user is deactivated, the NestJS JWT strategy validates signature and expiry only — it does not check `isActive`. A deactivated user with a valid access token (up to 15 min) and refresh token (up to 7 days) can continue making direct API calls.

**Fix:** On every JWT validation, load the user from the database and verify `isActive`. The performance cost is one indexed lookup per request — acceptable. Alternatively, maintain a Redis revocation set.

**Refresh token rotation not implemented**
`refresh()` issues a new access token but does not rotate the refresh token. A stolen refresh token provides indefinite access. Implement rotation: issue a new refresh token on each use, store a hash of the current valid token per user, and invalidate on reuse detection.

**Hardcoded MinIO credentials**
`minioadmin/minioadmin` is in `docker-compose.yml` and must be treated as compromised. Move to env vars and rotate immediately.

### RBAC Analysis

**Over-permissioned `customer_orderer`**
`customer_orderer` can disconnect services (`PATCH /services/:id/disconnect`). This means a junior purchasing agent can terminate a live service without manager approval. Consider a customer-side approval step for disconnection requests.

**Missing resource ownership check verification**
If the `orgId` ownership check in list/getOne service methods is applied inconsistently, a customer role could read cross-org data. Audit every query in customer-accessible controllers for `where: { orgId: user.orgId }`.

**No account lockout**
The login throttle falls back to IP for unauthenticated requests. Behind NAT or a shared proxy, all users from the same network share one throttle bucket. Add exponential backoff or account lockout after N failures per email address.

**Audit log access scope**
Audit log is restricted to `super_admin` and `ops_manager`. `ops_technician` cannot review their own work history. Customer admins cannot see the audit trail for their own orders — both are legitimate needs.

---

## 5. Scalability & Performance

### Identified Bottlenecks

- `rooms/:roomId/topology` — O(panels × ports) response with no cache or pagination
- `billing-events/pending` — returns all unexported events with no pagination; will grow unboundedly if billing system is slow
- `audit` table — unbounded growth with no partitioning; will degrade at 12–18 months of active use
- Next.js SSR API calls — every authenticated page render hits the NestJS API with no server-side cache

### Caching Strategy (currently absent)

| Layer                        | What to cache                         | TTL               |
| ---------------------------- | ------------------------------------- | ----------------- |
| Redis                        | User session data                     | 15 min            |
| Redis                        | Site/room port availability counts    | 30 sec            |
| Next.js `cache()`            | Location hierarchy (sites, buildings) | 5 min             |
| PostgreSQL materialized view | Port availability by panel            | Trigger-refreshed |

### Async Processing Opportunities

pg-boss is present but underutilized. Move these to background jobs:

- Billing event generation on service activation
- Audit log writes (fire-and-forget)
- Document virus scanning before marking upload complete
- SLA deadline checks (scheduled every 5 minutes)
- Notification dispatch (email, webhook)

---

## 6. Reliability & Operations

### Single Point of Failure

The entire system runs on one Docker Compose host. No Postgres replication, no WAL archiving, no PITR backup configuration is visible. MinIO runs as a single instance — disk failure means document loss.

Minimum immediate action: configure Postgres WAL archiving to an offsite bucket and add a `pg_dump` cron job.

### Job Queue Reliability

No explicit retry policy is configured on `JobsService.send()` calls — jobs use pg-boss defaults (3 retries, no backoff). No dead-letter queue monitoring. No alerting when a job exhausts all retries. A failed scheduled job (e.g., SLA expiry check) can leave services in incorrect states indefinitely and silently.

### Missing Observability

Currently: NestJS `Logger` writing to stdout.

Missing:

- **Distributed tracing** — no correlation IDs propagated from Next.js → NestJS → Postgres
- **Application metrics** — no Prometheus/OpenTelemetry; no dashboard for request latency or error rate
- **Alerting** — no thresholds for error rate, response time, queue backlog, or disk usage

Minimum viable stack: OpenTelemetry SDK (NestJS + Next.js) → Grafana Tempo + Prometheus + Grafana — all deployable in the same Docker Compose.

### No Migration Safety Net

Prisma migrations run at deploy time. If a migration is destructive and a rollback is needed, the database is already migrated forward. For a system managing physical infrastructure data, this is a data integrity risk. Adopt an expand/contract migration pattern and test rollbacks in CI.

---

## 7. Product & UX Gaps

### Missing Tier-1 Datacenter Platform Features

**Notifications** — Zero automated notifications. Ops team has no alert when a customer submits an order. Customers do not know when their order is approved or their service is activated. This is the single highest-friction gap in daily operations.

**SLA Management** — No SLA definition, tracking, or breach alerting. Datacenters are contractually bound to provision within defined windows. There is no mechanism to enforce or measure this.

**LOA / CFA Workflow** — Documents can be uploaded but there is no structured LOA workflow: no template generation, no required-before-approval guard, no e-signature integration.

**Bulk Operations** — No bulk port creation from CSV, no bulk work order assignment, no bulk billing event export. These are daily ops needs in medium-to-large datacenters.

**Customer-facing API** — No API key / OAuth2 client credentials flow for programmatic customer access. Enterprise customers expect this.

**Tagging / Cost Center** — No tagging on cross-connects, services, or ports. Customers managing hundreds of services have no way to group by project, contract, or cost center.

**Operator-side Reporting** — The SP portal has reports. The operator portal does not. Ops managers have no dashboard for provisioning velocity, port utilization trends, or order-to-activation lead time.

---

## 8. Automation & AI Opportunities

**Smart Path Planning** — Given that the full port graph exists in the database, a BFS/Dijkstra pathfinding algorithm with cost weights (distance, media type, availability) could auto-suggest the optimal cable path — reducing planning time from hours to minutes.

**Predictive Capacity Management** — Port utilization trends per panel/room can predict when a panel will reach 80% capacity. A weekly scheduled job surfaces this as an alert in the inventory dashboard.

**Auto-Approval Rules** — Repeat orders from trusted customers for standard service types in rooms with confirmed port availability could be auto-approved, bypassing the manual queue. This reduces ops workload by 30–50% for high-volume customers.

**Anomaly Detection** — A port that cycles `available → reserved → available` repeatedly signals a systemic problem (bad port, incorrect inventory). Flag ports with >3 failed reservation cycles for manual inspection.

**Work Order Bundling** — Batch work orders by physical proximity (same room, same rack) and suggest consolidated technician assignments to reduce field visit frequency.

---

## 9. Monetization & Business Model Enhancements

### Missing Billing Events

Currently tracked: `service_activated`, `service_disconnected`, `temporary_extended`, `reroute_completed`

Missing:

- `service_suspended` / `service_resumed`
- `port_reserved` — NRC trigger on initial port assignment
- `priority_provisioning` — premium SLA surcharge event
- `api_call` — metered usage for customer API access

### Premium Feature Tiers

| Tier         | Features                                                                   |
| ------------ | -------------------------------------------------------------------------- |
| Standard     | Current portal features                                                    |
| Professional | SLA tracking, email notifications, customer API keys, bulk exports         |
| Enterprise   | SSO/SAML, SCIM provisioning, white-label portal, custom approval workflows |

### SP Portal Revenue Gap

SP cross-connects currently generate no billing events. They should feed the same `BillingTriggerEvent` pipeline with a `sourceType: 'dedicated'` discriminator.

---

## 10. Technical Debt & Risk Assessment

### Priority-Ranked Backlog

| Priority | Item                                     | Effort  |
| -------- | ---------------------------------------- | ------- |
| P0       | Port reservation `SELECT FOR UPDATE` fix | 1 day   |
| P0       | `isActive` check in JWT strategy         | 1 day   |
| P0       | Rotate MinIO credentials to env vars     | 2 hours |
| P1       | Database backup + WAL archiving          | 1 day   |
| P1       | PgBouncer connection pooler              | 4 hours |
| P1       | Notification service (order + WO events) | 1 week  |
| P2       | Billing events → DedicatedCrossConnect   | 3 days  |
| P2       | Audit log monthly partitioning           | 1 day   |
| P2       | SLA tracking + breach alerts             | 1 week  |
| P2       | Refresh token rotation                   | 2 days  |
| P3       | Topology query pagination                | 2 days  |
| P3       | OpenTelemetry tracing + Grafana          | 3 days  |
| P3       | `on_hold` states for orders/work orders  | 2 days  |
| P4       | Customer API key system                  | 1 week  |
| P4       | Auto-approval rules engine               | 2 weeks |

---

## Top 15 Improvements — Ranked by Impact vs Effort

| Rank | Improvement                                              | Impact                | Effort |
| ---- | -------------------------------------------------------- | --------------------- | ------ |
| 1    | Fix port reservation with `SELECT FOR UPDATE`            | Critical bug          | Low    |
| 2    | Verify `isActive` in JWT strategy                        | Security              | Low    |
| 3    | Rotate MinIO credentials to env vars                     | Security              | Low    |
| 4    | Add PgBouncer                                            | Reliability           | Low    |
| 5    | Configure Postgres WAL archiving + backup cron           | Data safety           | Low    |
| 6    | Email/webhook notification service                       | Ops velocity          | Medium |
| 7    | Paginate + cursor `billing-events/pending`               | Correctness at scale  | Low    |
| 8    | Add `on_hold` state to orders and work orders            | Workflow completeness | Medium |
| 9    | Audit log table partitioning by month                    | Long-term performance | Low    |
| 10   | Add `service_suspended` + `port_reserved` billing events | Revenue completeness  | Low    |
| 11   | OpenTelemetry instrumentation (traces + metrics)         | Observability         | Medium |
| 12   | SLA definition + breach alerting via pg-boss scheduler   | Customer contracts    | Medium |
| 13   | Materialized port availability counts                    | Inventory query perf  | Medium |
| 14   | Refresh token rotation + per-user token hash             | Security hardening    | Medium |
| 15   | Smart cable path suggestion (BFS on port graph)          | Provisioning speed    | High   |

---

## "If I Were the CTO" — 6–12 Month Roadmap

### Month 1–2 — Stabilize & Secure

- Fix port reservation race condition
- Implement `isActive` check in JWT strategy
- Rotate all hardcoded credentials to environment variables
- Add PgBouncer
- Configure database backups with point-in-time recovery
- Add `on_hold` order/work-order states

### Month 3–4 — Observability & Notifications

- Deploy OpenTelemetry → Grafana stack
- Build notification service (email via SendGrid/Postmark + in-app feed)
- Wire notifications to order state changes, work order assignments, approval decisions
- Add SLA clocks to orders with configurable thresholds and automated escalation jobs
- Paginate all unbounded list endpoints

### Month 5–6 — Billing Integrity & Reporting

- Connect `DedicatedCrossConnect` to `BillingTriggerEvent` pipeline
- Add missing billing events (`service_suspended`, `port_reserved`, `reroute_initiated`)
- Build operator analytics dashboard: provisioning velocity, port utilization, order-to-activation lead time
- Implement refresh token rotation
- Partition `AuditLog` table by month

### Month 7–9 — Platform Growth

- Ship customer API key system (client credentials OAuth2 flow)
- Add LOA document workflow (template + required-before-approval guard)
- Build smart cable path suggestion (BFS with availability filtering)
- Implement auto-approval rules engine for standard repeat orders
- White-label SP portal configuration (logo, color, custom domain)

### Month 10–12 — Enterprise Readiness

- SSO / SAML 2.0 integration
- SCIM 2.0 for automated user provisioning from enterprise IdP
- Multi-region / HA deployment (Postgres primary + read replica, MinIO distributed)
- Predictive capacity management (weekly scheduled analysis, dashboard alerts)
- Customer-facing SLA portal with audit trail and compliance exports
