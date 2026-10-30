# Investigation assignment application case

## Sequence and invariants

`executeAssignInvestigation` coordinates existing domain assignment, active context validation, and an atomic snapshot/event commit. It does not select specialists, appoint a leader, execute the investigation, or confirm a finding. Domain and event schemas are unchanged.

The caller supplies investigation/simulation IDs, new `agentIds`, origin, `assignedAt`, event ID, and correlation ID. Mutable input lists/origin are copied before reads.

1. Load a matching investigation and safe, nonnegative, incrementable storage revision.
2. Load a matching running simulation. Require every proposed collaborator and any agent origin to be an active member. The assigning origin need not be an assignee.
3. Invoke domain `assignInvestigation`; reject empty/duplicate additions, terminal investigations, and backwards time while preserving existing collaborators.
4. Validate `investigation.assigned` with supplied metadata.
5. Call `InvestigationAssignmentCommitter.commitAssignment(event, expectedRevision)` to save the additive assignment and its pending event together.

System origin is trusted composition metadata, not authentication. Future external entry points must enforce authorization before invoking this operation.

## Revision, failures, and result

`VersionedInvestigation` contains `{ investigation, revision }`; revisions are storage metadata outside domain/event schemas. Requests begin at 0. A successful assignment increments by one. Every future writer must honor the same comparison discipline.

A missing record raises `INVESTIGATION_NOT_FOUND`; a competing revision raises `INVESTIGATION_CONFLICT` and enqueues nothing. The caller can deliberately reload and reconsider adding the losing collaborator. There is no automatic conflict retry. SQLite also validates that the new snapshot exactly matches the domain additive transition.

Read failures become `READ_FAILED`; commit failures become `SAVE_FAILED`, retaining causes and allowing for a lost commit acknowledgement. Invalid domain/contracts data retains existing errors. Reused event IDs with different content raise `EVENT_ID_CONFLICT`.

Results contain the assigned snapshot, incremented revision, exact event, and `queued` or `already-recorded` publication status. Reexecuting an already-applied assignment is not a delivery-recovery mechanism: domain validation rejects already-assigned collaborators. Retry stored events through the outbox instead. Context reads and permission changes are not part of the snapshot/event transaction. See [OUTBOX.md](OUTBOX.md).

## Mozaik reaction

The peer handler reserves turn capacity and records its assignment before admitting work. Multiple peers may collaborate without an exclusive leader. The session uses memory by default or explicitly supplied storage; it never reconstructs agents merely because persisted events exist.

Reaction keys prevent overlapping work. A pre-commit failure releases the key so deliberate redelivery may retry; no automatic use-case retry is scheduled. Existing stored participation suppresses duplicate work, including after a lost commit acknowledgement. This intentionally does not resume interrupted investigations. Closing admission suppresses new turns even after a successful commit. Each callback releases only its own reservation.

Event dispatch and asynchronous reactions are separate acknowledgements. Starting a recorded contribution need not wait for its assignment event to be dispatched. Outbox ordering preserves request-before-assignment dispatch for that investigation, not ordering against directly published observations or handler completion.

## Verification and deferred work

Application and orchestration tests cover context validation, additive updates, optimistic concurrency, immutable inputs, queueing before work, capacity, replay, failed commits, lost acknowledgements, and closure. SQLite tests cover transactional rollback and durable event delivery. All relevant commands are included in root checks.

Completion/result application cases, intelligent scheduling, automatic recovery, general authorization policies, Playwright, and UI changes remain deferred.
