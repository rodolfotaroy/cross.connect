# ADR 0001: Modular Monolith Architecture

**Date:** 2026-03-18  
**Status:** Accepted

## Context

The cross-connect management platform serves a single datacenter operator with a coherent
domain that requires strong transactional integrity between modules (e.g., port reservation
must be atomic with cable path creation). The team is small and the operational complexity
of managing multiple independently deployed services is not justified at this stage.

## Decision

Deploy as a **modular monolith**: a single NestJS process with clearly bounded modules
that own their controllers, services, and conceptually their database tables. Cross-module
access is via service injection, never by reaching into another module's database tables.

## Consequences

**Positive:**
- Single deployment unit — straightforward CI/CD, no distributed transaction complexity.
- Database transactions work naturally across module boundaries when needed.
- Module boundaries are enforced by NestJS `@Module()` `imports`/`exports` declarations.
- Can extract any module to a microservice later if a genuine scaling reason emerges.

**Negative:**
- All modules share a single PostgreSQL connection pool and process memory.
- A catastrophic bug in one module can affect all modules (mitigated by test coverage).

## Rejected alternatives

- **Microservices from the start:** Adds operational complexity (distributed tracing,
  inter-service auth, network latency) before a single user is onboarded.
- **Serverless functions:** Poor fit for long-running background jobs and WebSocket
  connections (future real-time work order updates).
