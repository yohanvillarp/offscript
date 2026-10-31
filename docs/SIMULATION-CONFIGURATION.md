# Simulation configuration

## Implemented scope

`executeConfigureSimulation` creates a persisted, configured simulation without starting exploration. It depends on project-inspection and atomic configuration-storage ports. The existing domain model and lifecycle are unchanged: the simulation is `created`, its selected users are `ready`, and no lifecycle event or outbox row is emitted.

Authenticated configuration HTTP and Studio integration are now implemented in the following increment. Browser interaction and execution controls are implemented separately; the normal browser factory still defaults to deterministic inference. Operator-facing model selection, validated autonomous reasoning, and automatic service startup remain deferred. See CONSOLIDATION.md.

## Shared contracts

`packages/contracts/index.ts` exposes `SimulationSetup`, `SimulationConfiguration`, `ProjectDescriptor`, behavioral profile IDs, execution limits, and runtime parsers. Setup contains:

| Field | Meaning |
| --- | --- |
| `name` | Optional explicit simulation name; otherwise use the detected project name. An explicitly blank name is invalid. |
| `targetUrl` | Absolute HTTP(S) application URL, normalized with the standard WHATWG URL parser. Embedded credentials are rejected. No request is made. |
| `environment` | Existing web environment/deployment classification. It grants no authorization. |
| `goal` | A nonblank concrete outcome shared by the selected users. Multiline text and its original whitespace are preserved. |
| `userProfileIds` | Nonempty, unique selection of `explorer`, `impatient`, and/or `beginner`. Avatar names are not profile IDs. |
| `limits` | Complete execution-budget object, or omitted to use the initial defaults below. |

Defaults are 3 turns per agent, 12 inference calls per turn, 15000 ms inference timeout, and 30000 ms session duration. Turn/call limits must be integers from 1 to 100. Time limits must be integers from 1 to 2147483647 ms, with inference timeout no longer than session duration. Saving limits records intent; enforcement is part of the later execution composition, not a side effect of configuration.

Contracts reject unknown fields and return detached, immutable values. URL parsing uses the standard global API available in Node.js 24 and browsers; contract/application TypeScript configurations include its DOM library typings without importing a browser framework. Domain configuration remains independent of Node/browser globals.

Stored configuration adds the caller-supplied simulation ID, resolved project root, and required final name. Paths and application URLs have separate roles. Root resolution does not infer a listening URL or prove that a backend exists.

## Read-only project recognition

`packages/projects/index.ts` exposes `inspectProject(projectRoot)`. It resolves the selected directory using the filesystem, reads only its `package.json`, and proposes its nonblank `name`. Missing manifests or missing/unusable names fall back to the directory name. Invalid paths, malformed manifests, and unreadable files fail explicitly. Manifests must be regular files of at most 1 MiB.

Inspection also reads the manifest scripts to recognize simple `vite` commands in `dev` or `start`. It suggests the explicit port or Vite default 5173 with a source label. Unsupported flags, compound shell commands, and unknown tools produce no suggestion. Inspection does not search parent repositories, scan installed dependencies, import project code/configuration, execute package scripts, read `.env`, probe ports, or launch services. Manifest values are untrusted metadata, never agent instructions or permissions. This is basic recognition, not a filesystem sandbox or a general discovery engine. Global versus local npm installation does not change the selected project root.

## Target suggestions and availability

`ProjectDescriptor.targetSuggestion` is optional and carries a normalized local URL, `vite-default` or `vite-script` source, and script name. This is an additive project-inspection DTO field, not saved runtime configuration. Vite configuration files, plugins, port fallback, HTTPS, or proxy behavior can override the suggestion. Studio never overwrites a manually edited URL when recognition completes or retries.

Authenticated `POST /api/target/check` accepts only `{url}`. The host invokes `executeCheckTarget` through the `TargetProbe` application port; the Node adapter lives in `packages/projects`. Checks allow HTTP(S) on `localhost`, `127.0.0.1`, or `[::1]` only, and reject credentials and the OFFSCRIPT listening port. Localhost maps directly to IPv4 loopback with IPv6 fallback on connection refusal, without DNS. Remote URLs remain valid simulation targets but are not probed in this increment.

Each check is an explicit GET with a 2.5-second overall deadline, at most two concurrent checks per host, an 8 KiB response-header limit, no credentials/cookies, no redirects, and no returned response body. TLS certificate validation remains enabled. Client disconnect and host shutdown cancel checks. Results distinguish an HTTP response (including redirects and error status codes), unreachable service, timeout, TLS error, and busy host. A response proves neither target identity nor backend readiness.

Studio invalidates the result and aborts the old check whenever the URL changes, and cancels on unmount. Saving does not require a successful check; nothing starts automatically, and results are not persisted. A future exploration start must recheck current readiness rather than trust a stale UI result. Managed process startup and multiple-service orchestration remain deferred.

## Profiles and persistence

The application maps behavioral IDs to the six implemented behavioral profiles and the selected goal using existing domain factories. Agent IDs use those behavioral keys within the simulation's existing scoped roster. Declared capabilities are empty; effective tool permissions are not inferred from profiles, avatars, URLs, or limits. The existing `AgentProfile` shape is retained.

`configurations.createConfiguredSimulation(configuration, simulation)` validates that both values describe the same initial simulation. A single immediate SQLite transaction inserts the simulation, its agents, and configuration metadata. Existing identities return `already-exists` without overwriting; the use case reports `SIMULATION_ALREADY_EXISTS`. Commit errors become `SAVE_FAILED`; inspection errors become `PROJECT_INSPECTION_FAILED`, retaining internal causes for trusted callers.

Migration `0002_simulation_configuration.sql` adds `simulation_configurations`, keyed to the simulation. Its validated JSON stores the approved configuration fields, without adding speculative permission/skill/evidence tables. Existing snapshots stay intact and do not receive fabricated configuration. `findConfiguration(id)` returns validated metadata or `undefined`; it neither re-inspects the filesystem nor resumes agents. Existing simulation reads still return the domain snapshot.

## Local host composition

After `start()`, the host exposes trusted in-process `inspectProject()`, `configureSimulation({simulationId, setup})`, and `findConfiguration(id)` methods. Recognition/configuration uses the host's selected root, not an arbitrary path received through an HTTP request. Guarded storage includes the configuration ports; new commits are rejected if host closure began during inspection. Saving configuration does not register a Mozaik session.

The host now exposes authenticated project/create/read/list HTTP operations and built Studio consumes them through shared contracts. The list is limited to the latest 50 configured records; snapshot-only legacy simulations are not fabricated into configurations. Execution start/inspect/stop/recover and results routes are documented separately in LOCAL-HOST.md; saving still starts nothing.

## Delete a saved simulation

The configuration detail panel offers **Delete simulation**, followed by an inline confirmation naming the simulation. This permanently removes the configuration, configured users, and all associated simulation state (observations, investigations, outbox rows, and visual evidence). It does not delete the target project, database file, or external resources. Studio prevents duplicate submissions, preserves the panel on failure, removes the row after success, and refreshes the list. If refresh fails after deletion, it reports that separately. User-detail views do not offer independent user deletion.

`executeDeleteConfiguredSimulation` depends on an atomic deletion port. The SQLite adapter uses an immediate transaction to require a configuration and ensures neither the simulation nor any agent is actively in `running` status. It then deletes dependent records in dependency order (`investigation_observations`, `investigation_agents`, `outbox`, `investigations`, `observations`, `simulation_configurations`, `agents`, `simulations`). Any failure rolls back every write. Missing configurations return `not-found`; active `running` simulations return `not-allowed`.

The host rejects deletion for registered, preparing, or actively executing sessions (`coordinator.hasActive(id)`) and reserves the simulation ID during deletion to block session registration. Deletion also purges associated visual evidence from the evidence store. Storage admission and shutdown draining apply to deletion as to other writes.

Authenticated `DELETE /api/simulations/:id` returns 204 without a body, 404 for a missing configuration, or 409 `DELETION_NOT_ALLOWED` when execution is actively in progress. Existing Host, Origin, bearer, and Studio cookie/header requirements apply. Archival and managed service cleanup remain deferred.

## Verification and next step

Focused tests cover address/profile/budget validation, project naming and fallback without script execution, real SQLite commit/reopen, duplicate preservation, rollback injection, inspection failure before writes, and host composition without execution. Existing lifecycle, parser-helper, and host-security tests are reused rather than duplicated. `typecheck:projects` and `test:projects` are included in root checks and exposed through Make.

Studio now saves and reads configurations through authenticated transport, with explicit avatar-to-behavior mapping and retained request identities on retries. Explicit controlled demo execution control (start, inspect, stop) is now implemented; see [LOCAL-HOST.md](LOCAL-HOST.md). Playwright interaction and six profiles are implemented. Service startup, broader framework detection, operator-facing live model setup, general action permissions, skills, Adaptive and Collaborative remain deferred. See CONSOLIDATION.md for current correctness gaps.
