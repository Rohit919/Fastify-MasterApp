# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for **Fastify-MasterApp**.

ADRs capture important architectural decisions, their context, alternatives, consequences, and status so future contributors can understand **why** the system is designed the way it is.

## ADR Principles

- Record decisions that have meaningful architectural consequences.
- Prefer small, focused ADRs.
- Document the decision, not every implementation detail.
- Record rejected alternatives when they clarify the trade-off.
- Do not rewrite history when a decision changes; create a new ADR and supersede the old one.
- Link related ADRs and implementation documentation.
- Keep ADRs version-controlled with the codebase.

## Status Values

| Status | Meaning |
|---|---|
| Proposed | Decision is being discussed. |
| Accepted | Decision is approved and should guide implementation. |
| Superseded | A newer ADR replaced this decision. |
| Deprecated | Decision is no longer recommended but remains historically relevant. |
| Rejected | Decision was considered and intentionally not adopted. |

## ADR Format

Each ADR should follow:

```text
# ADR-NNNN: Decision Title

- Status: Accepted
- Date: YYYY-MM-DD
- Owners: ...
- Supersedes: ...
- Superseded by: ...

## Context

## Decision

## Alternatives Considered

## Consequences

## Implementation Notes

## Related Documentation
```

## Current ADR Catalog

| ADR | Decision | Status |
|---|---|---|
| ADR-0001 | Modular Monolith Architecture | Accepted |
| ADR-0002 | Fastify as API Framework | Accepted |
| ADR-0003 | TypeScript as Application Language | Accepted |
| ADR-0004 | Prisma + PostgreSQL for Persistence | Accepted |
| ADR-0005 | TypeBox Shared API Contracts | Accepted |
| ADR-0006 | JWT Access Tokens + Refresh Token Rotation | Accepted |
| ADR-0007 | RBAC and Default-Deny Authorization | Accepted |
| ADR-0008 | React Admin as the Administrative Frontend | Accepted |
| ADR-0009 | TanStack Query for Server State | Accepted |
| ADR-0010 | Redis for Distributed Infrastructure | Accepted |
| ADR-0011 | BullMQ for Background Jobs | Accepted |
| ADR-0012 | At-Least-Once Job Processing + Idempotency | Accepted |
| ADR-0013 | Transactional Outbox for Critical Events | Accepted |
| ADR-0014 | Pino + Prometheus + Grafana Observability | Accepted |
| ADR-0015 | URL-Based API Versioning | Accepted |
| ADR-0016 | Centralized Error Contract | Accepted |
| ADR-0017 | Security-First Configuration and Secrets | Accepted |
| ADR-0018 | Queue Workload Isolation | Accepted |
| ADR-0019 | Docker-Based Deployment | Accepted |
| ADR-0020 | CI/CD with Immutable Artifacts | Accepted |

## Decision Lifecycle

```text
Proposed
   ↓
Discussed
   ↓
Accepted
   │
   ├──────────────► Implemented
   │
   └──────────────► Superseded
```

A decision should be revisited when:

- A major product requirement changes.
- The current architecture creates measurable operational problems.
- A dependency reaches an end-of-life state.
- Scale materially changes the trade-offs.
- Security requirements change.
- Regulatory/compliance requirements change.
- A simpler architecture becomes available.

## What Belongs in an ADR?

Good candidates:

- Framework selection.
- Database selection.
- Authentication architecture.
- Authorization model.
- API versioning strategy.
- Queue technology.
- Cache strategy.
- Outbox/event architecture.
- Deployment architecture.
- Observability architecture.
- Major package boundaries.
- Multi-tenancy strategy.
- Significant security decisions.
- Major data-modeling decisions.

Do not use ADRs for:

- Ordinary bug fixes.
- Formatting conventions.
- One-off implementation details.
- Temporary debugging notes.
- Routine dependency updates.

## Relationship to Other Documentation

ADRs explain **why**.

Architecture documentation explains **what**.

Development documentation explains **how to work with it**.

Examples:

```text
ADR
 ↓ why

ARCHITECTURE.md
 ↓ what

DEVELOPMENT.md
 ↓ how

Implementation
 ↓ actual code
```

## Creating a New ADR

1. Find the next available ADR number.
2. Create a focused decision title.
3. Describe the problem and constraints.
4. State the decision clearly.
5. Document meaningful alternatives.
6. Explain consequences.
7. Link affected architecture documentation.
8. Update this catalog.
9. Submit the ADR with the implementation when appropriate.

## ADR Quality Checklist

- [ ] Decision is explicit.
- [ ] Context explains the problem.
- [ ] Important constraints are documented.
- [ ] Alternatives are considered.
- [ ] Consequences are honest.
- [ ] Security implications are addressed when relevant.
- [ ] Operational implications are addressed when relevant.
- [ ] Related documentation is linked.
- [ ] Status is clear.
- [ ] Date is recorded.
