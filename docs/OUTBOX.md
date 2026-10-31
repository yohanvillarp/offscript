# Transactional investigation outbox

## Responsibility and boundaries

Investigation requests, assignments and completions commit a validated snapshot and its exact semantic event together. SQLite is the durable adapter; controlled sessions default to an ephemeral memory adapter. Domain and event schemas are unchanged. This is a delivery queue, not event sourcing, a second event bus, or a replacement for Mozaik's reactive runtime.

`InvestigationRequestCommitter.commitRequest(event)` creates revision 0. `InvestigationAssignmentCommitter.commitAssignment(event, expectedRevision)` validates the additive domain transition and increments the storage revision. The completion committer likewise validates the completion transition and expected revision. All derive the snapshot from the parsed payload. A failed snapshot, relationship, or outbox insert rolls back the entire transaction. Assignment conflicts enqueue nothing.

Identical event ID/content/revision returns `duplicate`; reuse with different content returns `event-conflict`. Application results say `queued` or `already-recorded`, never that processing finished. Duplicate commit protection is not general command idempotency: reexecuting an assignment against its already-updated snapshot still encounters domain duplicate-assignee validation.

Context reads and lifecycle checks remain outside the commit transaction. This increment does not solve concurrent permission changes or authenticate callers. Low-level `createInvestigation` and `saveAssignment` remain available for explicit snapshot/bootstrap operations; they do not enqueue events. Application use cases use only the atomic committers.

## Storage and ordering

Migration `0001_transactional_outbox.sql` adds `event_outbox`; the original migration is unchanged. Existing snapshots are preserved without manufacturing historical events. Each row contains a local sequence, unique event ID, simulation/investigation IDs, unique investigation revision, serialized versioned event, state, attempts, availability, reservation token/expiry, acceptance time, and a fixed diagnostic code. Provider exception text is not persisted in diagnostics. Event payloads retain their existing content; broader evidence redaction remains undecided.

States are `pending`, `leased`, `accepted`, and `failed`. An immediate transaction reserves eligible rows and increments their attempt counts. Publication occurs outside the transaction. A reservation has a fresh token and bounded lifetime; every acknowledgement, deferral, and rejection checks that exact token and a still-live expiry. Expired reservations may be reclaimed. A stale worker cannot acknowledge a newer reservation.

Only the oldest nonaccepted event for an investigation is eligible. Pending retries, live reservations, and terminal failures block its successors; unrelated investigations can continue. This orders dispatch per investigation, not the completion of asynchronous handlers. There is no global ordering guarantee.

## Dispatch and retry semantics

`dispatchOutboxBatch` in application code validates serialized contracts and stored identity/revision metadata, then delegates publication through `OutboxPublisher`. `packages/runtime` supplies the Node scheduler, single-flight batches, bounded publication timeout, polling, and explicit start/stop. Default settings are a 30-second reservation, batches of 10, five attempts, exponential retry delays from 100 ms to 10 seconds, a 250 ms unavailable-session deferral, 25 ms polling, and a 5-second publication timeout. Timing and limits are configurable and validated.

Publisher failure retries with the same stored event ID and correlation until the attempt limit. Invalid events fail immediately. A worker lost on its final reservation becomes terminal after expiry. Diagnostics use only `PUBLISH_REJECTED`, `INVALID_EVENT`, or `ATTEMPTS_EXHAUSTED`. Inspection and pending-state queries are available through the storage port; no manual retry/reset or retention interface is implemented.

A crash after publication but before acceptance can produce repeated dispatch. Delivery therefore uses at-least-once attempts within a bounded retry policy, not guaranteed eventual delivery or exactly-once effects. A timeout does not cancel an underlying publisher; late dispatch is still possible. Acknowledgement storage failures propagate and leave the reservation recoverable rather than being mistaken for publisher rejection.

## Mozaik composition

`createMozaikOutboxPublisher(resolveSession)` resolves an explicitly prepared active session. Missing, closed, wrong-simulation, or unmapped-origin sessions defer delivery without consuming an attempt. Draining never creates a runtime, joins agents, starts exploration, or restores previous agent work. Resolution is trusted local composition, not an authenticated HTTP API.

Acceptance means `sendEvent` returned, not that asynchronous situation handlers or inference completed. The session rejects event ID reuse with changed content. The observer deduplicates its local event log, while identical replay still reaches handlers. Peer reactions reserve capacity before assignment; pre-commit failure releases the reaction key so deliberate redelivery can retry. A recorded collaborator suppresses duplicate work even after loss of a commit acknowledgement. Interrupted work is not automatically resumed, and accepted dispatch does not provide a durable handler inbox or processing acknowledgement.

`createExplorationSession` defaults to session-owned memory storage. Its optional `storage` dependency accepts existing investigation committers, observation storage, and an outbox, allowing SQLite composition without importing database types. The caller must explicitly migrate and prepare the simulation and roster; construction does not hydrate them. Durable observations are saved before their existing direct publication; `observation.created` is outside the transactional outbox scope. Session snapshots show local activity rather than hydrating all persisted history. Await `session.close()` before closing supplied storage; it stops admission and waits for the dispatcher, but cannot guarantee cancellation of previously started provider/tool work. Commit admission is checked again at the session boundary. The session does not own the database connection.

## Verification and deferred work

Root checks include application, persistence, orchestration, and runtime typechecks/tests. Disk-backed tests cover atomic rollback, original-schema upgrades, reopen, competing connections, stale tokens, lost acknowledgements, ordering, deferral, corrupt events, bounded retries, and exhaustion. A real Mozaik runtime with deterministic inference exercises SQLite request/assignment composition without model API calls or a browser.

The local Fastify host now owns shared dispatch and protected health routes; hosted sessions use explicit external dispatch. See [LOCAL-HOST.md](LOCAL-HOST.md). Execution/results HTTP, CLI/Studio wiring, investigation completion, and initial evidence files are implemented. Durable handler processing/recovery, automatic agent resumption and operator outbox retry controls remain deferred. Evidence integrity/retention and lifecycle error handling require consolidation; see CONSOLIDATION.md.
