# Lifecycle contracts

## Boundary and public entry point

Import contracts through `packages/contracts/index.ts`. Contracts depend on the domain public entry point; the domain never imports contracts. No Mozaik, browser, database, framework, or provider types are exposed.

This foundation defines messages and snapshots only. It does not provide event delivery, subscriptions, ordering, persistence, authorization, execution, or event sourcing.

## Event envelope: schema version 1

| Field | Meaning |
| --- | --- |
| `eventId` | Nonblank, caller-supplied identity of the event. The producer is responsible for uniqueness. |
| `type` | One of the eight lifecycle event names below; discriminates the payload type. |
| `schemaVersion` | Literal numeric `1`. Other versions are rejected; no migration is implemented. |
| `occurredAt` | Valid UTC timestamp in canonical `YYYY-MM-DDTHH:mm:ss.sssZ` format. |
| `simulationId` | Domain-compatible identity of the affected simulation. |
| `origin` | `{ kind: "system" }` or `{ kind: "agent", agentId }`. Identifies the origin, not necessarily the affected agent. |
| `correlationId` | Nonblank, caller-supplied identity connecting related events. Preserved through serialization. |
| `payload` | An event-specific, readonly summary of the affected simulation or agent. |

IDs use the domain's nonblank string rules; they are not restricted to UUID syntax. Domain identity brands remain strings on the wire. No function generates IDs or reads the current clock. A correlation ID does not establish event order or authenticity.

## Event names and payloads

Events describe past-tense OFFSCRIPT lifecycle facts. Each payload carries the named summary with the required lifecycle status:

| Event | Payload | Status |
| --- | --- | --- |
| `simulation.started` | `{ simulation: SimulationSummary }` | `running` |
| `simulation.completed` | `{ simulation: SimulationSummary }` | `completed` |
| `simulation.failed` | `{ simulation: SimulationSummary }` | `failed`, with a nonblank reason |
| `simulation.cancelled` | `{ simulation: SimulationSummary }` | `cancelled` |
| `agent.started` | `{ agent: AgentSummary }` | `running` |
| `agent.completed` | `{ agent: AgentSummary }` | `completed` |
| `agent.failed` | `{ agent: AgentSummary }` | `failed`, with a nonblank reason |
| `agent.cancelled` | `{ agent: AgentSummary }` | `cancelled` |

The TypeScript union encodes the exact status for each event type. A simulation summary ID must match the envelope's `simulationId`; an agent summary must reference that simulation. Its `id` identifies the affected agent independently of `origin`.

Starting a session does not start all agents. Agent completion concerns participation, not one inference turn or goal success. Simulation completion can include failed or cancelled agents. Cancellation describes logical state and does not prove external effects stopped. Mozaik events such as `model.answer` are not direct equivalents of these facts; their future mapping must respect these distinctions.

## Summary DTOs

- `SimulationSummary`: `id`, `environment`, `lifecycle`, and readonly `agentIds`. It supports all existing simulation states, including `created`.
- `AgentSummary`: `id`, `simulationId`, `name`, and `lifecycle`. It supports all existing agent states, including `ready`.

DTOs reuse domain identity, lifecycle, and environment value types, with detached, recursively frozen copies of nested data. They do not expose agent profiles, personality instructions, tools, credentials, effective permissions, or mutable entities. The roster rejects duplicate IDs.

`toSimulationSummary(simulation)` and `toAgentSummary(simulationId, agent)` map domain snapshots without changing them. The caller supplies an agent's simulation association; the mapper does not certify membership.

## Validation and serialization

- `parseSimulationSummary(unknown)` and `parseAgentSummary(unknown)` validate decoded summary data.
- `parseLifecycleEvent(unknown)` validates a decoded event and returns a detached, frozen snapshot.
- `createLifecycleEvent(LifecycleEvent)` adds compile-time input checking and uses the same runtime validation. It constructs a value; it does not certify a fact, perform a transition, or publish an event.
- `serializeLifecycleEvent(event)` validates before returning JSON.
- `deserializeLifecycleEvent(json)` parses JSON and validates the resulting event.

Validation is explicit TypeScript code with no added dependencies. Version 1 accepts plain JSON-shaped data and rejects unknown fields, unsupported discriminators/versions, invalid identities, invalid dates, mismatched subject/status metadata, missing required fields, and failure states without a nonblank reason. Optional values must be omitted according to their discriminated shape, not represented by `undefined`. Failures raise `ContractValidationError` with a failing `path`.

These checks validate structure and local consistency. They cannot prove occurrence, valid domain transition history, goal achievement, sender identity, authorization, global ID uniqueness, or correlation membership. Validated external messages remain untrusted claims until handled by future application and policy boundaries. Investigation execution, confirmed findings, event processing, and replay are not implemented.

## Observation extension

The lifecycle API described above remains restricted to its eight events. The opt-in `SemanticEvent` union adds `observation.created` using the unchanged version-1 envelope and `{ observation: ObservationSummary }` payload. Its public functions are `createSemanticEvent`, `parseSemanticEvent`, `serializeSemanticEvent`, and `deserializeSemanticEvent`; `parseObservationSummary` validates standalone observation DTOs. Existing lifecycle entry points continue to reject the new event type. See [OBSERVATIONS.md](OBSERVATIONS.md) for observation semantics, provenance checks, evidence-reference limitations, and schema compatibility.

## Investigation extension

`SemanticEvent` additionally includes version-1 `investigation.requested`, `investigation.assigned`, and `investigation.completed`. Each payload contains an `InvestigationSummary` with the corresponding lifecycle. Public entry points also expose `InvestigationEvent`, `InvestigationPayloads`, `parseInvestigationEvent`, `parseInvestigationSummary`, and `parseInvestigationResult`. All new events use the existing envelope; no existing schemas are changed. The union expansion requires exhaustive consumers to handle the new discriminators. See [INVESTIGATIONS.md](INVESTIGATIONS.md) for collaborative assignment, author consistency, outcome rules, reference limitations, and deferred execution.

## Verification

Run `npm run typecheck:contracts` for strict production/test checking, including compile-only negative type cases. Run `npm run test:contracts` for Node unit tests. Root `npm test` preserves the domain suite and adds contracts tests; `npm run check` includes both modules, lint, and the Studio build. Tests need no network, browsers, or credentials.
