# Application foundation

## Scope

`packages/application/index.ts` exposes request/assignment use cases, atomic investigation commit ports, and a transport-independent outbox batch dispatcher. Production code depends only on domain/contracts public entry points and its own files. It imports no database, Mozaik, framework, timers, or concrete adapter. There is no independent package manifest.

## Request sequence

`executeRequestInvestigation` snapshots caller-owned command data before awaiting adapters. The caller supplies identities, canonical UTC time, event ID, and correlation ID; the use case reads no clock and generates no IDs.

1. Read a matching running simulation and require an active requesting member.
2. Resolve the ordered observations; require matching identities, simulation scope, and authors belonging to the roster. Authors need not still be active or be the requester.
3. Invoke domain `requestInvestigation`, preserving its hypothesis, time, and unique/nonempty reference rules.
4. Validate the version-1 `investigation.requested` event with requester origin and the supplied correlation.
5. Call `InvestigationRequestCommitter.commitRequest(event)` to atomically store the requested snapshot and pending event.

The result contains the immutable investigation, exact event, and `publication.status` of `queued` or `already-recorded`. It does not invoke a publisher or claim downstream completion. Assignment is documented in [ASSIGNMENTS.md](ASSIGNMENTS.md); storage, dispatch, replay, and recovery boundaries are specified in [OUTBOX.md](OUTBOX.md).

## Failures and concurrency

| Boundary | Behavior |
| --- | --- |
| Context reads | Missing or inconsistent resources raise specific `ApplicationError` codes. Adapter rejection becomes `READ_FAILED` with its cause. No commit occurs. |
| Domain/contract validation | Existing error types are preserved. Invalid input never reaches the committer. |
| Existing investigation | `already-exists` becomes `INVESTIGATION_ALREADY_EXISTS`; it must not overwrite the snapshot or enqueue another event. |
| Identical event | Atomic committer returns `duplicate`; the application reports `already-recorded`. |
| Event ID reused with different content | Raises `EVENT_ID_CONFLICT`. |
| Commit rejection | Raises `SAVE_FAILED` with its cause. The acknowledgement may have been lost after commit; automatic use-case retry is not attempted. |

Committers are trusted ports; implementations must validate and atomically persist both sides of the write. Context reads are outside that transaction, so simulation participation can change after validation. Membership checks do not authenticate the caller or authorize tools. Future transport adapters must map errors deliberately and avoid exposing adapter causes.

## Validation and deferred work

`npm run typecheck:application` and `npm run test:application` check strict typing, immutable inputs, context resolution, commit failures/conflicts, and result semantics without external services. They are included in root checks. SQLite and runtime integration tests separately exercise actual delivery boundaries.

Investigation completion, permission policy engines, context-wide transactions, evidence-resource storage, HTTP, CLI commands, and Studio wiring remain unimplemented. Observations and hypotheses remain untrusted data, not execution instructions or confirmed findings.
