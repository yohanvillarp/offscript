# Testing strategy

## Purpose

Protect OFFSCRIPT's behavior with a maintainable set of tests. A new function, file, component, or architectural layer is not itself a reason for a new test. Before adding coverage, name the observable failure it should detect and check whether an existing test already detects it.

The current suite was developed alongside domain, contracts, persistence, Mozaik, outbox, and host foundations. It includes useful failure-path coverage but also repetitive assertions and shared-validation matrices. The reported case count includes parameterized inputs; it does not measure independent product guarantees or readiness for real software exploration.

## What deserves dedicated coverage

| Risk | Appropriate evidence |
| --- | --- |
| Invalid lifecycle or investigation transitions | Focused domain tests for distinct allowed/forbidden transitions and meaningful invariants. |
| Untrusted serialized input | Focused shared-validator cases, representative public-entry integration checks, and payload-specific rules. |
| Cross-simulation access or unauthorized effects | Boundary tests showing the operation is rejected before effects occur. |
| Lost or overwritten data | Real SQLite tests for atomic rollback, revisions, scope constraints, migrations, and reopen. |
| Duplicate or misordered delivery | Outbox tests for reservations, fencing, retry identity, aggregate ordering, and acknowledgement loss. |
| Adapter/runtime incompatibility | Representative integration flows with the installed Mozaik/Fastify adapters; controlled inference and no live providers by default. |
| Resource leaks or unsafe shutdown | Real host lifecycle tests and focused failure/timeout scenarios. |
| A reported regression | The smallest reproducer that would have caught that failure. |

Unit and integration tests may both be justified when they protect different guarantees. Domain validation does not prove untrusted JSON is decoded correctly; an application mock does not prove a database transaction rolls back. Preserve those boundaries rather than deduplicating solely because test names look similar.

## Usually unnecessary additions

- A new test for each helper extraction, wrapper, getter, export, or component solely because it was added.
- Tests that reproduce a function's implementation with mocks and assert the same incidental sequence of calls.
- The full matrix of blank/null/wrong-type metadata repeated for every event when all use the same envelope validator.
- Serialization round-trips and repeated freeze checks in every application success test when contracts already establish that property and the use case adds no distinct guarantee.
- Tests asserting CSS classes, cosmetic dimensions, literal noncontractual wording, or private object layout for routine presentation changes.
- Tests proving basic compiler behavior, framework internals, or speculative features that have not been implemented.

These are defaults, not blanket exemptions. A wrapper that changes authorization, forwarding, errors, or disposal may need a test. Mutating a caller-owned array across an awaited operation is a distinct risk from checking `Object.isFrozen` on every returned object. A duplicate call count can be essential when repeated work would create effects or consume inference budget.

## Findings from the current implementation

This is a targeted source review, not a completed suite reduction or a claim that every listed case can be deleted unchanged. No tests were removed as part of adopting this policy.

| Existing area | Assessment and next action |
| --- | --- |
| `packages/contracts/tests/investigations.test.ts` | The same invalid version, event ID, time, and correlation patches are multiplied across three event types. These use `parseEventEnvelope`, also exercised by lifecycle tests. Consolidate common-envelope cases and keep representative integration plus investigation-specific lifecycle, author, and simulation checks. |
| `packages/contracts/tests/events.test.ts` | Good location for focused envelope validation. Keep distinct timestamp/schema/origin failure classes; avoid repeating their complete matrix in every other event suite. Keep a valid public path for each supported discriminator. |
| `packages/application/tests/request-investigation.test.ts` and `assign-investigation.test.ts` | Success tests repeat contract round-trips/freeze assertions and require an exact read sequence. Center these on the committed snapshot/event, revision, result, and absence of writes on rejection. Keep causal ordering only where it protects a real guarantee. |
| Domain lifecycle tests | Parameterization is justified where it covers different allowed/forbidden transitions. Consolidate repeated generic value-validation inputs only when another test protects the same rule. |
| Studio draft validation tests | Required fields, URL credential rejection, goals, and storage-unavailable behavior are useful. Routine visual changes should not grow this suite without a new behavioral risk. |
| SQLite/outbox tests | Preserve failure injection, reopen, optimistic concurrency, scope, stale reservations, lost acknowledgements, and retry ordering. These exercise different failure modes rather than cosmetic blocks. |
| Host/security/Mozaik tests | Preserve authentication, authority/origin rejection, shared dispatch, closure, and real integration. An optional callback or utility does not need a separate test unless it adds a distinct failure guarantee. |

Reducing the displayed count by putting all cases inside one `test()` does not remove duplication. A useful cleanup removes redundant setup/assertions or repeated execution paths while retaining the named product guarantees. Do not target a predetermined smaller number.

## Workflow for future changes

1. Describe the changed behavior and material failure risk.
2. Identify existing tests and typechecks that cover it. New tests are optional when that coverage is sufficient.
3. Add or adjust only the smallest meaningful missing cases. Prefer a test at the boundary that owns the guarantee; do not mirror it across layers automatically.
4. Run relevant focused commands. Run the complete required pipeline before publication, and honor existing hooks/CI.
5. Report actual results and their limits. State whether new tests were needed; do not imply a passing count proves real-target exploration works.

Documentation-only changes need link/content checks, not application builds. Styling-only changes normally need existing lint/build and any authorized accessibility/visual validation, not new unit tests. Browser checks and live provider calls require the scope and authorization established for the task; do not silently introduce them.

The command catalog is in [DEVELOPMENT.md](DEVELOPMENT.md). Architectural guarantees remain defined by [ARCHITECTURE.md](ARCHITECTURE.md), [OUTBOX.md](OUTBOX.md), and [LOCAL-HOST.md](LOCAL-HOST.md).
