# Investigation foundation

## Product semantics

An investigation examines an explicit hypothesis prompted by one or more observations. Any artificial user may request or contribute to it; profiles are not exclusive issue specializations. The requester need not be the author of the observations.

An investigation can have multiple assigned agents without an exclusive leader. Assignments identify participation, not tool authorization or runtime membership. Completion records a result presented by one assigned agent; it does not assert collaborator consensus, goal achievement, or a confirmed defect. Automatic completion, voting, and verification policies remain unimplemented.

## Domain values and operations

Import through `packages/domain/index.ts`. `Investigation` contains:

- Branded `InvestigationId`, simulation identity, requesting agent, hypothesis, and caller-supplied `requestedAt`.
- A nonempty, unique list of related observation IDs.
- A discriminated lifecycle with the fields below.

| Lifecycle | Fields and permitted operation |
| --- | --- |
| `requested` | No assignment or result. `assignInvestigation` moves it to `assigned`. |
| `assigned` | Nonempty, unique `agentIds` and `assignedAt`. More agents may be assigned; `completeInvestigation` ends the work. |
| `completed` | Retains assignment, plus `completedAt`, `completedBy`, and `result`. Terminal; no new assignment or second completion. |

`requestInvestigation(request, observations)` validates and copies the supplied observation values, requires them to belong to the same simulation, and retains only their IDs. Their persistence/existence and the requester’s simulation membership are not certified.

`assignInvestigation(investigation, agentIds, assignedAt)` adds a nonempty list of new collaborators. Duplicate IDs, including already-assigned agents, are errors. The prior snapshot is unchanged. `assignedAt` records the latest assignment operation and cannot precede the request or previous assignment. Existing assignments cannot be removed or replaced in this increment.

`completeInvestigation(investigation, result, completedBy, completedAt)` requires an assigned investigation and an author in its assigned roster. Completion cannot precede the latest assignment. This consistency rule is not a security gate: a future application/policy boundary must decide which caller may invoke the operation. No runtime work is stopped or performed.

IDs follow existing nonblank-string rules. Hypotheses and result explanations must be nonblank and remain literal data. Times use canonical UTC `YYYY-MM-DDTHH:mm:ss.sssZ`; equal operation timestamps are allowed. Factories and operations read no clock, generate no identities, and copy/freeze nested values. Clock-skew reconciliation and the ordering of observation times relative to requests remain unresolved.

## Results and evidence

`InvestigationResult` contains `outcome`, `explanation`, and distinct `evidenceIds`:

| Outcome | Meaning | Evidence references |
| --- | --- | --- |
| `supported` | The recorded assessment supports the hypothesis. | At least one. |
| `contradicted` | The recorded assessment contradicts the hypothesis. | At least one. |
| `inconclusive` | The investigation did not establish either conclusion. | May be empty. |

These are assessments, not verified findings. References do not prove resource existence, relevance, integrity, provenance, or sufficiency. The model does not expose `confirmed`, severity, or security authorization. Result evidence need not have appeared in the initial observations: collecting additional evidence is a future capability. Supporting or contradictory observations can already be included among the related observations; adding more observation links after request is deferred.

## Contracts and semantic events

`InvestigationSummary` reuses the immutable, JSON-compatible domain shape. `parseInvestigationSummary(unknown)` validates required fields, unknown-field rejection, state-specific shape, references, timestamp ordering, and result-author assignment. `parseInvestigationResult` validates standalone result data. Parsers return detached, recursively frozen snapshots and raise `ContractValidationError` with the failing path.

The existing semantic entry points accept these version-1 events, each with `{ investigation: InvestigationSummary }` payload and the matching lifecycle:

- `investigation.requested`: a request was recorded. An agent origin must match `requestedBy`.
- `investigation.assigned`: the included collaborator roster was assigned or extended. The origin may be an assigning agent outside that roster; permission is checked elsewhere in future execution.
- `investigation.completed`: a result was recorded. An agent origin must match `completedBy`.

A system origin may record any of these facts. Envelope and payload simulation IDs must match. Event occurrence time is independent metadata; snapshot operation times carry the local ordering constraints above. Correlation IDs are preserved without proving history or event order. The assignment event carries the resulting roster, not an inferred delta; a future handler needs prior state to determine additions.

Events do not execute domain operations or certify legal transition history, user authenticity, cross-resource membership, authorization, consensus, or findings. Standalone DTO parsing has only observation IDs, so it cannot reproduce the request operation's same-simulation validation against full observations. Application-layer reference resolution remains necessary. Hypotheses, observations, and explanations are untrusted content, never privileged instructions.

## Compatibility and deferred work

Existing lifecycle and observation schemas and their validation rules are unchanged. `LifecycleEvent` remains restricted to its original eight events. `SemanticEvent` gains three discriminators; consumers using exhaustive switches must handle them before adopting this revision. Schema version stays `1` because existing event shapes have not changed; adding event names does not imply that older consumers accept them.

There is no orchestration, investigation execution, policy engine, event bus, persistence, evidence collection, automatic assignment, automatic close, or new Studio/CLI functionality. Investigation lifecycles do not automatically change simulation or agent lifecycles. Cancellation, failures, reassignment, reopening, concurrency conflict resolution, and verified-finding policy require later explicit decisions. A completed snapshot alone does not prove external work stopped.

## Validation

The existing `typecheck:domain`, `test:domain`, `typecheck:contracts`, and `test:contracts` commands include these files. Tests cover lifecycle operations, collaborative assignment, reference integrity checks, timestamp rules, immutable snapshots, discriminated payload types, invalid inputs, and serialization compatibility. `npm run check` also validates Studio and the production build without external services or browser automation.
