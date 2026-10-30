# Investigation assignment application case

## Scope

`executeAssignInvestigation` is exported from `packages/application/index.ts`. It connects the existing domain assignment operation to context resolution, optimistic concurrency, and publication. It does not choose specialists, assign a leader, execute an investigation, or confirm findings. Domain and event schemas remain unchanged.

The command supplies the investigation/simulation IDs, a nonempty list of new `agentIds`, an `origin`, `assignedAt`, `eventId`, and `correlationId`. Caller-owned lists and origin metadata are copied before asynchronous reads.

## Validation and sequence

1. Load the investigation and its storage revision. Require matching investigation/simulation identities and a usable nonnegative safe-integer revision.
2. Load the simulation; require matching identity and `running` lifecycle.
3. Require every proposed collaborator to belong to that simulation and have `running` participation. For an agent origin, require that assigning actor to be an active member too; it need not be a new assignee.
4. Invoke domain `assignInvestigation`, preserving its empty/duplicate-agent, terminal-state, and timestamp validation. Existing collaborators are retained.
5. Construct and validate `investigation.assigned` using the existing version-1 contract and supplied correlation metadata.
6. Save through atomic compare-and-set, then publish only after that save succeeds.

An active actor identity is a consistency condition, not proof of authentication or authorization. System origins are accepted as trusted composition metadata. Future external entry points must authenticate callers and authorize operations before invoking this case. The Mozaik reaction binds actor and assignee to the mapped participant, never to model arguments.

## Revision and concurrency boundary

`VersionedInvestigation` contains `{ investigation, revision }`. The revision is storage metadata, not a domain field or event schema change. The session-memory adapter creates requested records at revision `0`.

`InvestigationAssignmentStore.findInvestigation(id)` returns the immutable domain snapshot and revision. `saveAssignment(assignedSnapshot, expectedRevision)` must atomically:

- Check that the record still exists and its revision equals `expectedRevision`.
- Replace the snapshot without changing identity/simulation and increment the revision by one.
- Return `saved`, `conflict`, or `not-found`.

A conflict raises `INVESTIGATION_CONFLICT`, without a write or publication by the losing operation. It is not retried automatically. A caller may deliberately reload and reconsider the assignment; doing so can append the losing collaborator without discarding the winner. Every future writer, including completion, must use the same revision discipline. Otherwise optimistic concurrency cannot protect it.

This protects the investigation record only. Simulation/agent reads, snapshot saving, and event publication are not a single transaction; lifecycle or permissions could change after validation. Cross-resource transaction policy, durable publication, and concurrent event ordering remain unresolved.

## Failure and result semantics

Missing records, inconsistent references, invalid/exhausted revisions, inactive simulations, and missing/inactive agents raise specific `ApplicationError` codes. Adapter read failures become `READ_FAILED` with their cause. Domain/contract validation errors retain their existing types and occur before saving.

A save rejection becomes `SAVE_FAILED` and suppresses publication, but its commit outcome may be unknown. `not-found` becomes `INVESTIGATION_NOT_FOUND`. No rollback or automatic retry is attempted.

A successful save returns the assigned snapshot and incremented revision. If publication resolves, the result says `published`, acknowledging the publisher operation only. If it rejects, the result still contains the saved snapshot, revision, and exact event with `unconfirmed` publication and the cause. Downstream delivery may already have happened. Reexecuting a saved assignment is not an event-recovery mechanism: domain duplicate checks will reject already-assigned agents.

## Mozaik integration

The configured peer reaction to `investigation.requested` now reserves turn capacity, invokes the application case to register itself, and only then queues or starts its contribution. This is the current minimal integration policy, not an intelligent scheduler or an assignment tool exposed to the model. Multiple active peers may participate; no leader is imposed.

The session-memory store owns immutable versioned records in `ExplorationState`. Its compare/check/replace sequence contains no `await`, making that operation atomic within this single process. It is not a distributed database guarantee. Assignment events preserve the request's correlation ID and use the peer's mapped identity as origin.

Rejected assignments and conflicts record a diagnostic and start no turn. Reactions remain deduplicated by peer/investigation; a failed attempt is not retried by replay. Competing peer assignments can therefore leave one peer unassigned until an explicit future recovery decision. If saving succeeds but publication is unconfirmed, the recorded participant can still proceed; if the session closes, it does not admit new work even when assignment has already been saved. Each callback releases only its own capacity reservation.

## Verification and deferred work

Application tests cover initial/additional assignments, context validation, terminal investigations, duplicate references, read/save/publication failures, CAS conflicts, deliberate reload, immutable inputs, and type discrimination. Runtime tests verify assignment before work, capacity checks, failed-assignment suppression, deduplication, correlation, closing sessions, independent reservations, and the real session-memory CAS behavior. Existing module commands and `npm run check` include these tests.

Completion/result application cases, smart collaborator selection, automatic conflict retries, authorization policies, SQLite, Playwright, and UI changes remain outside this milestone.
