# Application foundation

## Scope and dependencies

`packages/application/index.ts` exposes `executeRequestInvestigation` and `executeAssignInvestigation`. This document details requesting; [ASSIGNMENTS.md](ASSIGNMENTS.md) describes assignment, context validation, storage revisions, and optimistic concurrency. Application code depends on the public domain and contracts entry points. Its asynchronous ports describe only the reads, create, and publication required by this operation; the application module itself imports no concrete adapter, framework, database, event bus, or runtime. The Mozaik adapter now composes these ports with session-memory storage and local runtime publication; see [MOZAIK-INTEGRATION.md](MOZAIK-INTEGRATION.md).

The module has no independent package manifest. Test adapters live under `packages/application/tests`, not in the production public API. They are in-memory implementations for behavior/failure tests, not a persistence solution.

## Requesting an investigation

The command contains `investigationId`, `simulationId`, `requestedBy`, `observationIds`, `hypothesis`, `requestedAt`, `eventId`, and `correlationId`. IDs, time, and correlation come from the caller; the use case does not read the clock or generate values. It snapshots caller-owned command data before awaiting adapters.

Processing is explicit and sequential:

1. Resolve the simulation through `SimulationReader`; require the returned identity to match and its lifecycle to be `running`.
2. Resolve the requester from that simulation's roster; require active (`running`) participation. No profile/specialization or declared capability grants permission.
3. Resolve each observation through `ObservationReader` in the supplied order. Require matching lookup identity, the same simulation, and an author in its roster. The author need not be the requester or still be active.
4. Call the existing domain `requestInvestigation` operation. It validates the hypothesis, time, unique/nonempty observation list, and observation values, and creates an immutable requested snapshot.
5. Construct and validate `investigation.requested` with the existing version-1 envelope. Its agent origin is the requester; `occurredAt` uses the supplied `requestedAt`. Invalid domain or event data causes no write.
6. Save through `InvestigationWriter.createInvestigation`, then await `InvestigationRequestedPublisher.publishInvestigationRequested` only if creation succeeded.

The result contains the requested domain snapshot, the exact validated event, and a discriminated publication status. The application result is a local execution result, not an external JSON DTO: an unconfirmed publication can contain an arbitrary adapter error as its `cause`. A future transport must map errors deliberately and avoid exposing adapter internals.

## Port obligations and failures

| Boundary | Behavior |
| --- | --- |
| Simulation/observation reads | Missing resources and inconsistent references produce specific `ApplicationError` codes. Adapter rejection becomes `READ_FAILED` with the original cause; no save or publication occurs. |
| Domain/contract validation | Existing `DomainError` or `ContractValidationError` is preserved; no save or publication occurs. |
| Create | The adapter must perform atomic create-if-absent by investigation ID. `already-exists` becomes `INVESTIGATION_ALREADY_EXISTS`; it must never overwrite or publish another event. |
| Create rejection | Becomes `SAVE_FAILED` with the cause. Publication is not attempted. An adapter can fail after committing, so absence of a saved record is not promised. |
| Publication resolves | Result has `publication.status: "published"`. This acknowledges only the publisher port's resolved operation, not downstream processing or durable delivery. |
| Publication rejects | The successfully saved investigation and exact event are returned with `publication.status: "unconfirmed"` and the cause. Delivery might already have occurred. No rollback or automatic retry is attempted. |

Reexecuting the command after successful creation is a conflict, even if publication previously failed. An explicit recovery action could reuse the returned event, preserving its ID and correlation, but no retry/recovery workflow or deduplication service exists here. Consumers must not assume exactly-once delivery.

Atomic create-if-absent prevents competing requests from overwriting the same identity when adapters honor the contract. It does not make simulation reads, observation reads, saving, and publication one transaction. The simulation or requester can change after validation; preventing that race requires a future adapter-level concurrency/transaction decision. The two-step save/publication sequence also has a process-crash gap. No durable outbox, delivery guarantees, or recovery process is claimed.

## Security and deferred work

Ports are trusted application dependencies and must return immutable domain values. Runtime contract parsing belongs at external entry boundaries. Membership and lifecycle checks do not authenticate a requester or enforce tool/action policy. Hypotheses and observations remain untrusted content; this use case performs no model inference or target interaction.

Investigation completion/result use cases, real-software execution, general policy enforcement, transactions across context reads/writes, durable event delivery, production adapters, evidence storage, CLI commands, Studio integration, and HTTP endpoints remain unimplemented.

## Validation

`npm run typecheck:application` validates production and compile-only test cases with strict TypeScript. `npm run test:application` runs Node unit tests using in-memory ports and injected failures. Both are included in root `npm run check`; application tests also run through `npm test`, and existing package lint includes application code. Tests require no network, browsers, model providers, or database.
