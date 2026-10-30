# Mozaik runtime integration

## Installed boundary

The root npm package pins `@mozaik-ai/core` to **4.2.0**. It is a Node runtime dependency, not a Studio dependency. There are no workspaces or internal package manifests.

`packages/orchestration/index.ts` exposes `createExplorationSession` and its options. Domain and contracts do not import Mozaik. The adapter uses Mozaik's real runtime, participants, situation handlers, inference/tool loop, and shared `RuntimeState`; it does not implement a second inference loop or event bus.

The investigation tool invokes `executeRequestInvestigation` through its existing ports. All simulation snapshots, observations, investigations, identity mappings, permissions, admission budgets, reactions, and diagnostics belong to the session's `ExplorationState`. No second global collaboration store exists.

## Session behavior

Provide a running domain simulation with ready/running agents, a model name, and an explicit per-agent tool allowlist. The adapter creates a fresh Mozaik runtime per session and maps domain agent IDs to generated participant IDs. Joining a configured ready agent explicitly activates its domain participation. Terminal participation cannot be activated.

Each agent gets its own Mozaik memory and handlers. Starting a busy agent is rejected; investigation reactions received while it is busy are queued within its turn budget only after assignment is saved; pending assignments reserve capacity so simultaneous callbacks cannot overbook it. A guarded `model.answer` handler releases admission on the next event-loop iteration, after the installed implementation advances to idle. Neither a model answer nor `waitForIdle` completes domain participation, goals, investigations, or simulations.

An `investigation.requested` event can lead configured peers to register their participation through `executeAssignInvestigation` before starting independent inspection. Reactions are keyed by recipient and investigation identity; replays do not schedule repeated investigation work. The current reaction is a minimal peer self-assignment policy, without an exclusive leader, specialist selection, or automatic result confirmation. Registration uses a versioned session-memory store with atomic compare-and-set; conflicts do not start work or retry automatically. Assignment failures remain deduplicated until an explicit recovery decision. See [ASSIGNMENTS.md](ASSIGNMENTS.md); the completion application case remains deferred.

## Event bridge and publication

The Mozaik event type `offscript.event` carries the full validated OFFSCRIPT envelope as its payload. The adapter preserves event identity, schema version, simulation identity, occurrence time, origin, correlation, and typed payload. It maps the runtime producer to the originating agent or joined session observer. Decoding rejects cross-simulation events, producer mismatch, and timestamp changes.

The investigation publication port forwards through `sendEvent`. Its successful resolution acknowledges dispatch to the local runtime, not the completion of asynchronous reactions. An observer records accepted events in session state and invokes an optional callback; callback promises are caught and tracked separately. No durable delivery, authentication, or event-history guarantee is implied. Public session methods are trusted composition APIs, not external authenticated endpoints.

## Controlled tools

All tools operate only on the integration fixture and local session state:

| Tool | Responsibility |
| --- | --- |
| `inspect_application` | Return the simulated cart before or after reload; it performs no browser or HTTP request. |
| `record_observation` | Validate model-provided description/location, bind author and simulation from session state, create an observation, and publish its event. |
| `request_investigation` | Validate referenced observation IDs and hypothesis, invoke the application request use case, save in session memory, and publish the resulting fact. |

Only explicitly allowed tools are exposed. Every `invoke` checks the allowlist again and rejects work after closure. Model arguments cannot select another agent, simulation, permission set, or external target. Domain capability declarations grant no permission. Failures return a bounded tool error response and are retained as internal diagnostics. This is a local allowlist boundary, not the future general security policy engine.

Observation and investigation events currently share a session correlation ID; a richer investigation/turn correlation policy is deferred. Descriptions, tool results, and hypotheses are treated as untrusted data in the instructions; no prompt text can grant new tools or bypass `invoke` checks.

## Inference, limits, and errors

The default Mozaik runner is created by the runtime, preserving its provider selection and request validation. Its public `run` method is decorated for session admission, call budgets, deadline handling, and error capture. A supplied runner is wrapped in a session-owned object first, so different sessions cannot overwrite the caller's runner methods. Streaming is disabled in this increment.

Version 4.2.0 discards the promise returned by its internal `AgentLoop.run`. Inference rejection can therefore become an unhandled rejection unless contained before leaving the runner. The adapter converts controlled inference errors, deadlines, invalid outputs, and exceeded inference budgets to a recorded failure plus a terminal assistant message for that turn. It accepts one actionable function call or answer per inference output, optionally accompanied by reasoning items. Multiple actions or missing actions are rejected because this version only executes its first function call. This intentionally limits supported output patterns; it is not a claim that all provider responses work.

The adapter catches its own situation-handler callbacks and tool failures. It does not claim to recover from every unexpected error inside Mozaik internals. Defaults are 3 turns per agent, 12 inference calls per turn, a 15-second inference deadline, and a 30-second session duration; the demo uses a 60-second session budget. These limit adapter admission and waiting, not guaranteed provider cost or cancellation.

Closing a session stops new turns/tools and leaves its participants. A timeout ignores late inference results, but neither timeout nor `leave` guarantees that provider work has been aborted. There is no exported abort handle in the verified `runLoop` API. No process-wide unhandled-rejection handler or alternate loop is installed to hide that limitation.

## Cloud export

The installed package includes `@mozaik-ai/cloud-sdk` and creates a cloud client per loop. It can find a project key in environment variables, `.env`, or cached credentials and export participant/tool/memory data. There is no public cloud opt-out argument on the installed runtime factory.

For this local adapter, `MOZAIK_API_KEY` must explicitly be an empty string. The SDK's nullish-fallback behavior makes that empty value disable export before it can fall back to another key. The library adapter checks this condition without mutating environment variables. The demo entry point and isolated test setup set it explicitly; this affects their processes only. The SDK emits its own telemetry-disabled warning. Cloud export is not used by this milestone.

## Reproducible execution

From the repository root:

```sh
npm run demo:mozaik
```

This uses the real Mozaik runtime with a deterministic inference fixture. Two agents run concurrently, notice a simulated cart discrepancy, and react to an investigation request. The expected deterministic result is three observations, one investigation request, one registered collaborator with an `investigation.assigned` event, and no failures. The domain simulation remains running. The fixture intentionally supplies scripted inference responses for reproducible integration verification; it is not evidence of autonomous discovery by an LLM or testing of real software.

For optional live inference:

```sh
npm run demo:mozaik -- --live
```

Set `OFFSCRIPT_MODEL` to a model supported by installed Mozaik and supply its provider credentials through the environment or an untracked root `.env`. The script uses Node's environment-file loader and never prints credentials. No provider or model is chosen implicitly for live mode. Live inference can consume provider quota and may produce different actions/results; deterministic counts are not live-mode assertions. The target remains the simulated local cart. A live execution has not been performed as part of this implementation.

## Validation and deferred integration

`npm run typecheck:orchestration` checks production, tests, and demo scripts. `npm run test:orchestration` uses the installed runtime with deterministic/injected runners; test setup disables cloud export and blocks `fetch`. Both commands are included in root validation. Tests cover concurrent agents, session isolation, mapping, correlation, replays, invalid arguments, permissions, tool/application wiring, async failures, bounded activations, inference limits, late results, and closure.

Playwright, real target discovery, SQLite, durable publication, MCP, general policy enforcement, cancellation guarantees, full investigation execution, and new CLI/Studio features remain outside this increment.
