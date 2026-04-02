# Migration Notes — Order Intake Slice (v1)

## Overview

These notes cover the Prisma schema additions required for the **Order Intake** vertical slice. Run migrations in the listed order after completing any in-flight development migrations.

---

## 1. Initial baseline migration

**Migration name:** `20260101_initial_schema`

Creates all models used by the slice:

```
Site → Building → Room → Cage → Rack → Panel → Port
Organization, User
CrossConnectOrder, OrderEndpoint
CrossConnectService, ServiceEndpoint
CablePath, CablePathSegment
DemarcPoint
AuditEvent
```

### Run on dev

```bash
pnpm db:migrate:dev --name initial_schema
```

### Run on production

```bash
pnpm db:migrate:prod
```

---

## 2. Service lifecycle fields

**Migration name:** `20260318_service_lifecycle_fields`

### What changed

Added four nullable columns to `CrossConnectService` to support the full service lifecycle state machine (suspend, disconnect):

```prisma
// CrossConnectService
suspendedAt           DateTime?
suspendedReason       String?
disconnectRequestedAt DateTime?
disconnectReason      String?
```

### Rationale

The `services.service.ts` `suspend`, `disconnect`, and `abortProvisioning` methods record timestamps and reasons when transitioning service state. These fields are write-once from the state machine transitions; `suspendedAt`/`suspendedReason` are cleared on `resume` (set to NULL).

### SQL preview (Postgres)

```sql
ALTER TABLE "CrossConnectService"
  ADD COLUMN "suspendedAt"           TIMESTAMP(3),
  ADD COLUMN "suspendedReason"       TEXT,
  ADD COLUMN "disconnectRequestedAt" TIMESTAMP(3),
  ADD COLUMN "disconnectReason"      TEXT;
```

All columns are nullable so existing rows require no backfill.

### Run on dev

```bash
pnpm db:migrate:dev --name service_lifecycle_fields
```

---

## 3. Guards & seed data required before first login

Before calling any API you need at minimum:

```bash
pnpm db:generate        # generate Prisma client from schema
pnpm db:migrate:dev     # apply all pending migrations (creates tables)
pnpm db:seed            # seeds a super_admin user + demo org
```

The seed creates:

| Field | Value |
|-------|-------|
| Email | `admin@crossconnect.local` |
| Password | `Admin1234!` (change immediately) |
| Role | `super_admin` |
| Org code | `OPERATOR` |

---

## 4. Order lifecycle state columns (reference)

`CrossConnectOrder` has these state-tracking timestamp columns written by `orders.service.ts`:

| Column | Written when |
|--------|-------------|
| `submittedAt` | `draft → submitted` |
| `approvedAt` | `pending_approval → approved` |
| `approvedById` | `pending_approval → approved` |
| `rejectionReason` | `pending_approval → rejected` |
| `cancelledAt` | any non-terminal → cancelled |
| `cancelledReason` | any non-terminal → cancelled |

---

## 5. AuditEvent write pattern

All state transitions write to `AuditEvent` **inside the same transaction** as the model update. The invariant is:

> A state change row and its audit record are either both committed or both rolled back.

`diff` is stored as `Json?` in the schema.  Shape convention:

```json
{
  "before": { "state": "draft" },
  "after":  { "state": "submitted" },
  "reason": "optional free text"
}
```

---

## 6. Index notes

Add these indexes if the admin audit log query becomes slow under load (> 100k events):

```prisma
@@index([occurredAt])                  // on AuditEvent — range queries
@@index([action])                      // on AuditEvent — filter by action prefix
@@index([serviceId, occurredAt])       // on AuditEvent — per-service timeline
```

Run `pnpm db:migrate:dev --name audit_perf_indexes` after adding.
