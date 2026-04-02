# ADR 0002: Two-Layer Domain Model (Service Intent vs Physical Implementation)

**Date:** 2026-03-18  
**Status:** Accepted

## Context

Cross-connect management has two fundamentally different layers of concern:

1. **Commercial/service layer:** Who wants to connect to whom, under what commercial
   terms, with what LOA approvals. This is what the customer cares about.

2. **Physical implementation layer:** Which specific ports, panels, and cable segments
   are used to fulfill that connection. This is what the technician cares about.

Collapsing these into a single object (as many DCIM and ticketing tools do) creates
several problems:
- You cannot model reroutes cleanly (same service, new physical path).
- You cannot capture "service is approved but no ports assigned yet."
- You cannot support A/B diverse paths without duplicating service information.
- Audit trails conflate commercial decisions with physical actions.

## Decision

**Strictly separate:**

| Entity | Layer | Owns |
|---|---|---|
| `CrossConnectOrder` | Service | Customer intent, media type, endpoint preferences, notes |
| `CrossConnectService` | Service | Running service record, lifecycle state, billing triggers |
| `ServiceEndpoint` | Service | Who is on A-side and Z-side, their demarc text from the LOA |
| `CablePath` | Physical | Ordered list of port-to-port segments, path state, tech who installed |
| `PathSegment` | Physical | One hop: fromPort → toPort, cable label, segment type |

A `CrossConnectService` may exist without any `CablePath` (approved, awaiting physical planning).
A `CrossConnectService` may have two `CablePath` records (primary + diverse A/B paths).
A reroute creates a new `CablePath` on the same `CrossConnectService` without changing the service record.

## Consequences

**Positive:**
- Reroute, diversity, and repair workflows are naturally modeled.
- Service billing lifecycle is independent of physical path changes.
- Technician work is scoped to `CablePath` + `WorkOrder`; customer sees only `CrossConnectService`.
- Port reservation/release is fully encapsulated in the physical layer.

**Negative:**
- More database joins required for full views.
- Developers must understand the two-layer model to avoid confusion.

## Rejected alternatives

- **Single `CrossConnect` entity:** Unworkable for reroutes and A/B diversity.
- **Three-layer model (adding a logical layer):** Deferred. IP/logical circuit management
  is explicitly out of scope for MVP.
