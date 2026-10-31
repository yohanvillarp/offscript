# Simulation configuration

## Implemented scope

`executeConfigureSimulation` creates a persisted, configured simulation without starting exploration. It depends on project-inspection and atomic configuration-storage ports. The existing domain model and lifecycle are unchanged: the simulation is `created`, its selected users are `ready`, and no lifecycle event or outbox row is emitted.

Authenticated configuration HTTP and Studio integration are now implemented in the following increment. Model selection, browser actions, autonomous execution, and automatic service startup remain deferred.

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

Inspection does not search parent repositories, scan dependencies, import project code, execute package scripts, read `.env`, detect frameworks, probe ports, or launch services. Manifest values are untrusted metadata, never agent instructions or permissions. This is basic recognition, not a filesystem sandbox or a general discovery engine. Global versus local npm installation does not change the selected project root.

## Profiles and persistence

The application maps behavioral IDs to the three approved personalities and the selected goal using existing domain factories. Agent IDs use those behavioral keys within the simulation's existing scoped roster. Declared capabilities are empty; effective tool permissions are not inferred from profiles, avatars, URLs, or limits. The existing `AgentProfile` shape is retained.

`configurations.createConfiguredSimulation(configuration, simulation)` validates that both values describe the same initial simulation. A single immediate SQLite transaction inserts the simulation, its agents, and configuration metadata. Existing identities return `already-exists` without overwriting; the use case reports `SIMULATION_ALREADY_EXISTS`. Commit errors become `SAVE_FAILED`; inspection errors become `PROJECT_INSPECTION_FAILED`, retaining internal causes for trusted callers.

Migration `0002_simulation_configuration.sql` adds `simulation_configurations`, keyed to the simulation. Its validated JSON stores the approved configuration fields, without adding speculative permission/skill/evidence tables. Existing snapshots stay intact and do not receive fabricated configuration. `findConfiguration(id)` returns validated metadata or `undefined`; it neither re-inspects the filesystem nor resumes agents. Existing simulation reads still return the domain snapshot.

## Local host composition

After `start()`, the host exposes trusted in-process `inspectProject()`, `configureSimulation({simulationId, setup})`, and `findConfiguration(id)` methods. Recognition/configuration uses the host's selected root, not an arbitrary path received through an HTTP request. Guarded storage includes the configuration ports; new commits are rejected if host closure began during inspection. Saving configuration does not register a Mozaik session.

The host now exposes authenticated project/create/read/list HTTP operations and built Studio consumes them through shared contracts. The list is limited to the latest 50 configured records; snapshot-only legacy simulations are not fabricated into configurations. No new execution controls are exposed.

## Verification and next step

Focused tests cover address/profile/budget validation, project naming and fallback without script execution, real SQLite commit/reopen, duplicate preservation, rollback injection, inspection failure before writes, and host composition without execution. Existing lifecycle, parser-helper, and host-security tests are reused rather than duplicated. `typecheck:projects` and `test:projects` are included in root checks and exposed through Make.

Studio now saves and reads configurations through authenticated transport, with explicit avatar-to-behavior mapping and retained request identities on retries. Next: explicit simulation start/observe/stop. Framework/URL suggestions, service startup, model configuration, permissions, Playwright, skills, and the remaining user profiles are deferred.
