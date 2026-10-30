# Observation foundation

## Meaning and scope

An observation records behavior noticed by an artificial user in a simulation. It is not a defect verdict, suspicion, investigation, or confirmed finding. Any profile can produce one; there is no specialization or capability requirement in this value model.

The immutable domain value is created with `createObservation` from `packages/domain/index.ts`. No execution, collection, event delivery, persistence, or investigation workflow is implemented.

## Fields and invariants

| Field | Responsibility |
| --- | --- |
| `id` | Branded `ObservationId`, supplied by the caller. |
| `simulationId` | Simulation in which the behavior was observed. |
| `agentId` | Artificial user that noticed the behavior, independent of a system event producer. |
| `observedAt` | Caller-supplied canonical UTC time: `YYYY-MM-DDTHH:mm:ss.sssZ`. |
| `description` | Nonblank account of the observed behavior, preserved literally. |
| `context.location` | Nonblank, opaque location such as a page URL, route, or screen identifier. It is not interpreted, fetched, or restricted to browser software. |
| `evidenceIds` | Readonly array of distinct branded `EvidenceId` references; may be empty. |

IDs follow existing nonblank-string rules, without UUID requirements. The factory validates values and copies/freezes nested context and evidence references. Observations have no update API, lifecycle, severity, confidence, or confirmation flag in this increment. Evidence IDs identify supporting resources that a future evidence facility could resolve; they do not embed files, URLs, credentials, or storage paths as an approved storage format. Their existence, ownership, integrity, and retention are not verified here.

Simulation/agent IDs retain provenance, but the value factory does not prove membership or require a particular simulation lifecycle. It neither reads a clock nor generates identities. The recorded observation time and event occurrence time have separate meanings; ordering and clock-skew policy remain unresolved.

## Public data and events

`ObservationSummary` reuses the domain's immutable JSON-compatible observation shape. `parseObservationSummary(unknown)` validates all required fields, rejects unknown fields, and returns a detached, recursively frozen value. There is no redundant mapper or infrastructure representation.

`observation.created` records the fact that an observation was created. Its version-1 payload is `{ observation: ObservationSummary }`. It uses the same envelope field meanings as the lifecycle events in [CONTRACTS.md](CONTRACTS.md).

- Envelope and observation simulation IDs must match.
- For an agent origin, the origin agent must match the observation author.
- A system origin may record an observation on behalf of its named artificial-user author.
- `observedAt` records when behavior was noticed; envelope `occurredAt` records the event occurrence time.
- Correlation is caller-supplied and preserved; it does not establish ordering, authenticity, or authorization.

These consistency checks do not prove that the behavior occurred or authorize action. Descriptions and locations remain untrusted application-derived content; future model/tool boundaries must not treat them as instructions.

## Compatibility and entry points

The addition is opt-in: existing `LifecycleEvent` types and lifecycle parsing/serialization functions retain their eight event types, exact version-1 shape, and rejection of observation events. They have not been widened silently.

The new `SemanticEvent` discriminated union includes those eight lifecycle events and `ObservationCreatedEvent`. Use `createSemanticEvent`, `parseSemanticEvent`, `serializeSemanticEvent`, and `deserializeSemanticEvent` for that broader union. Both families share envelope validation. Unknown event types, unsupported versions, invalid JSON, and inconsistent payloads raise `ContractValidationError` with a failing path.

Schema version remains `1` because no existing event schema has changed. Consumers must explicitly adopt the new semantic entry points before receiving observations; legacy consumers do not acquire forward compatibility automatically. Future changes to existing payload meanings or required fields need an explicit versioning decision.

## Deferred work

Investigation identity, hypotheses, assignment, lifecycle, conclusions, and events require a separate domain milestone. Evidence storage/collection, deduplication, confirmation policy, runtime authorization, event routing, Mozaik integration, browser automation, persistence, CLI commands, and Studio presentation are outside this foundation.
