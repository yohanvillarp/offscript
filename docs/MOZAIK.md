# Mozaik alignment

## Scope and reference

This note records OFFSCRIPT's alignment with the locally supplied Mozaik v4 documentation in `context/mozaik`. That reference directory is ignored by Git and may be unavailable in another clone; the contracts needed for architectural decisions are summarized here. The initial review has now been checked against installed @mozaik-ai/core 4.2.0 and automated integration tests; the local reference remains useful but is not the package API source of truth.

Relevant source documents: `Runtime.md`, `RuntimeState.md`, `Participants.md`, `ConcurrentAgents.md`, `TheAgentLoop.md`, `SituationHandlers.md`, `SemanticEvents.md`, `Interception.md`, and `Tool.md`. No other application is used as an integration specification. Mozaik is installed at the repository root with exact version 4.2.0. Published dist/index.d.ts and dist/index.mjs were inspected; the adapter and reproducible execution are described in [MOZAIK-INTEGRATION.md](MOZAIK-INTEGRATION.md).

## Documented contracts

| Concern | Mozaik reference behavior |
| --- | --- |
| Runtime | `defineRuntime<State>()` supplies the session functions. Initialize once before using them; these functions are not top-level package exports. |
| Membership | `createAgent` and `createHuman` create participants. Session functions `join(participant)` and `leave(participant)` update membership and publish events. |
| Identity | Factories generate participant UUIDs. A manifest contains identity, role, and declared capabilities. |
| Behavior | Situation specifications select events; processors react. Observers use the same participant factories and restrict their behavior to observation. |
| Shared state | A `RuntimeState` subclass holds the participant registry and application-specific shared data. |
| Concurrency | Each `runLoop` starts an independent turn and returns `void`. Multiple agents, or multiple loops on one agent, can run concurrently. |
| Turn execution | The loop handles inference, tool invocation, follow-up inference, and a model answer before becoming idle. |
| Event delivery | Events fan out to joined participants. Processors may be asynchronous, but the runtime does not await their promises or route their async failures onto the bus. |
| Interception | A matching interception handler is awaited before the next executable transition. It can inspect or rewrite that transition. |
| Tools | `InferenceInput.tools` supplies the tools executed by the loop through `invoke`; the model's capability declaration is not authorization. |

Synchronous event fan-out does not make asynchronous state changes sequential or transactional. The documentation's non-blocking processor description concerns awaiting promises; CPU-bound synchronous processor work can still block JavaScript execution.

## OFFSCRIPT decisions

- Keep domain models independent of Mozaik imports and mutable runtime classes. Domain operations return immutable snapshots.
- Use Mozaik for reactive coordination and its existing inference/tool loop. OFFSCRIPT owns session rules, enforced permissions, evidence semantics, and eventual completion criteria.
- Separate a simulation's lifetime, an artificial user's participation, runtime membership, inference turns, and goal achievement. They are not interchangeable state machines.
- Starting a simulation leaves its agents ready. Activate participation explicitly. A model answer ends a turn, not necessarily the artificial user's participation or goals.
- A session can complete once every participation is terminal, including failed or cancelled agents. Completion does not assert goal success or absence of defects. Timing and budget policies remain unimplemented.
- Keep the configured roster of artificial users distinct from runtime membership. The initial domain does not support roster changes; this does not prohibit runtime observers or other participants joining/leaving. Map domain agent IDs to generated participant IDs explicitly when implementing the adapter.
- Keep collaboration state in the typed runtime state when integrated, with explicit ownership for asynchronous updates. Do not create a competing hidden shared store or bypass domain invariants when replacing snapshots. SQLite storage and the investigation outbox are separate adapters; neither persists Mozaik memory nor resumes participants.
- Maintain OFFSCRIPT event semantics separately from Mozaik envelope types and provider payloads. Select events by type and origin, with validated correlation where available; a global `model.answer` listener must not complete every simulation.
- Enforce authorization at the tool execution boundary before effects occur. Observing `function_call.started` is not an awaited authorization gate. Interception can support review, but does not replace enforced tool checks.
- `sendEvent` requires a joined sender but publishes the supplied event as-is, including its producer ID. Treat producer fields and model-generated payloads as data to validate, not proof of authorization.

## Guarantees not established by the reference

Do not invent APIs or assume the following without checking the selected implementation:

- `runLoop` returning a promise, an execution handle, or an abort signal.
- `leave` cancelling in-flight inference, tool effects, or cleaning up external resources.
- A `model.answer` event proving goals were achieved, a session is finished, or every effect has settled.
- Loop identity isolating concurrent writes to the same agent memory. A distinct `loopId` does not establish memory synchronization.
- All event families carrying a loop ID: the installed loop visitor adds it to its loop-produced events, while custom and membership events do not acquire one automatically. Do not infer session lifecycle from that field.
- Durable event delivery, replay, backpressure, async processor error routing, or transactional shared-state updates.
- Interception exposing a dedicated veto, pause, or shutdown API beyond its documented transition-rewrite contract.

Domain cancellation updates snapshots only. It cannot establish that external work stopped. The initial adapter now handles bounded admission, per-agent overlap prevention, controlled error capture, and late inference results. It does not guarantee provider interruption or durable recovery. No general policy engine is implemented.

## Verified 4.2.0 differences and constraints

- ModelContext exposes addContextItem/addContextItems; the reference addItem example does not match the installed API.
- runLoop discards the internal async AgentLoop.run promise. Inference failures require containment at the runner boundary; handlers must catch their own async failures.
- The tool runner catches malformed argument JSON and invoke errors. The loop selects only the first function call from an output, so the initial adapter rejects multiple actionable items instead of silently dropping work.
- The runtime constructs its own default runner/validator. OFFSCRIPT decorates that session-owned runner's public run method; it does not duplicate provider validation or the inference loop.
- The package includes @mozaik-ai/cloud-sdk and initializes cloud export per loop when credentials are discovered. This local adapter requires an explicit empty MOZAIK_API_KEY; entry points set it to prevent env-file/cached credential fallback.

Tests verify concurrent agents, cross-agent investigation reactions, mapped identities, event correlation, isolated sessions, runtime-bound publication, and controlled failures. This verifies integration against a simulated fixture, not autonomous exploration of a real application or universal cancellation guarantees.
