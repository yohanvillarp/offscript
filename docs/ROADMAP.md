# Product roadmap

## Destination

A developer installs OFFSCRIPT through npm, authorizes a real application and its backend, chooses artificial users and a goal, and starts an exploration. Users with different behaviors act concurrently through Mozaik, share observations, and investigate unexpected behavior. Studio makes activity, evidence, and outcomes understandable. The CLI starts and manages the local experience.

Users pursue outcomes rather than scripted steps. A profile influences behavior, not which problems an agent is allowed to discover. Tools, skills, effective permissions, and execution limits remain separate concerns. An observation or a supported hypothesis is not automatically a confirmed finding.

This is a proposed sequence of outcomes, not authorization to implement the whole roadmap. Individual milestones require their own scoped plan. No dates, endpoints, package trees, or database schemas are committed here. [PROJECT.md](PROJECT.md) defines the product; [ARCHITECTURE.md](ARCHITECTURE.md) defines confirmed boundaries.

## Starting point

Status describes the inspected source, not deployment or GitHub merge state. Check the current branch and PRs before beginning a milestone.

| Area | Implemented | Remaining gap |
| --- | --- | --- |
| Domain and contracts | Simulation/agent lifecycles, validated events, shared setup/configuration contracts, execution status contracts with live recent activity, finding assessment with confirmation criteria, and expanded behavioral profile catalog (Explorer, Impatient, Beginner, Regular, Meticulous, Distrustful). | Broader multi-round session debate and verification policies. |
| Mozaik | Concurrent controlled agents, enforced fixture and browser tool permissions, mapped events, reactive assignment, investigation completion tool, controlled demo execution factory, autonomous browser exploration session factory, expanded browser tooling (`browser_scroll`, `browser_select`), profile-aware prompt heuristics, and real-time agent activity tracking. | Live provider inference in production. |
| Browser automation | Playwright Chromium adapter in packages/browser, target scope enforcement, opaque element handles, semantic ARIA snapshots, sanitized credentials, isolated user contexts, expanded interaction tools (`scroll`, `select`), visual viewport screenshot capture, and autonomous exploration loop with profile-specific instructions. | Full video session recording and broader non-web targets. |
| Persistence and delivery | SQLite snapshots/configuration, atomic setup creation, atomic aggregate lifecycle updates, investigation outbox supporting completion events, observations recorded from browser exploration, local bounded evidence screenshot retention (`.offscript/evidence`), and optional SQLite-backed Mozaik sessions. | Durable handler recovery, operational retention, and broader production composition. |
| Studio | Design system, connected setup with project recognition, initial Vite URL suggestions, explicit local availability checks, compact saved configurations with a detail panel, six behavioral profiles, editable limits, execution controls for both controlled demo and browser exploration, live agent activity feed, exploration results review (findings, observations, investigations), and interactive visual evidence preview modal. | Visual evidence diffing and canvas annotation tooling. |
| Local product entry | Protected Fastify health and execution routes, authenticated evidence asset endpoint (`/api/simulations/:id/evidence/:evidenceId`), local host lifecycle, shared dispatch, development entry, local npm archive launcher, multi-mode execution coordination (controlled-demo and browser-exploration), and CLI inspection workflows (list, results). | Published package distribution and end-to-end investigation CLI workflows. |


The current demo uses a simulated cart and deterministic inference. It does not explore an actual application. Transactional dispatch does not restore agent work or acknowledge handler completion.

## Suggested milestones

### 1. Local runtime host — implemented foundation

Compose the existing application, SQLite, outbox, and explicitly prepared Mozaik sessions under a local host. Use the approved Fastify direction for the server boundary. Establish configuration, resource ownership, startup/shutdown, and local access protection before exposing control operations.

**Implemented:** one local process starts, reports health, and shuts down with preserved data and explicit timeout/error handling. Stored state does not reactivate agents. This foundation is covered by local automated tests; distribution and Studio integration remain later work.

### 2. Simulation setup and operator control — implemented foundation

**Implemented:** read-only project recognition, validated simulation configuration, atomic creation and deletion of configured simulations, and explicit operator execution control (start, inspect, stop) against the controlled integration fixture. See [SIMULATION-CONFIGURATION.md](SIMULATION-CONFIGURATION.md) and [LOCAL-HOST.md](LOCAL-HOST.md). The local host coordinates execution through an explicit session factory, atomic aggregate persistence in SQLite, and protected HTTP endpoints. Studio provides explicit "Run controlled demo" and "Stop execution" controls with polling and status badges. Next: Milestone 3 — Authorized browser interaction.

### 3. Authorized browser interaction — implemented foundation

**Implemented:** Playwright Chromium integration (`packages/browser`), target scope enforcement restricting navigation strictly to authorized target origins, opaque element reference resolution (`elem_x`), semantic ARIA snapshot capture with visible DOM fallback, credential sanitization (passwords kept out of snapshots/logs), isolated `BrowserContext` per artificial user, observation attribution to domain entities, and hermetic automated test suites. Next: Milestone 4 — First autonomous exploration of real software.

### 4. First autonomous exploration of real software — implemented foundation

**Implemented:** autonomous multi-agent exploration against real web applications using Playwright Chromium in isolated user contexts (`BrowserContext`). Agents with initial behavioral profiles (Raven/Explorer, Fox/Impatient, Compass/Beginner) autonomously pursue exploration goals through bounded interaction tools (`browser_navigate`, `browser_inspect`, `browser_click`, `browser_type`, `record_observation`, `request_investigation`) using opaque element references (`elem_x`), scope enforcement, and password sanitization. Observations are attributed to domain agents, persisted in SQLite, and published via `observation.created` semantic events. The local host and Studio support the `"browser-exploration"` execution mode alongside the controlled demo. Hermetic automated test suites run multi-agent exploration against local targets without network leaks or orphaned Chromium processes. Next: Milestone 5 — Collaborative investigation and evidence.

### 5. Collaborative investigation and evidence — implemented foundation

**Implemented:** collaborative multi-agent investigation completion and evidence tracking. The application use case `executeCompleteInvestigation` validates context, simulation state, and collaborator assignment, coordinating domain `completeInvestigation` and committing with optimistic storage revision CAS. The `complete_investigation` tool is available in both controlled demo and browser exploration sessions, allowing an assigned artificial user to record traceable assessment outcomes (`supported`, `contradicted`, `inconclusive`) with attributable evidence references. `FindingAssessment` and `evaluateFindingAssessment` enforce explicit confirmation criteria: a conclusion requires multi-agent corroboration and evidence verified against simulation observations to be classified as a confirmed finding, otherwise communicating clear uncertainty (`provisional`, `inconclusive`, `refuted`). SQLite persists completed investigations and the transactional outbox dispatches `investigation.completed` events. Next: Milestone 6 — Usable CLI and Studio workflow.

### 6. Usable CLI and Studio workflow — implemented foundation

**Implemented:** complete end-to-end developer journey connecting target configuration, exploration execution, and results inspection across CLI and Studio. The local Fastify host serves authenticated `GET /api/simulations/:id/results` delivering validated `SimulationResults` (chronological observations, collaborative investigations, and evaluated finding assessments). Studio features `SimulationResultsView` with responsive tabs for Corroborated Findings (with explicit confirmation and uncertainty badges), Observations (with agent avatars, timestamps, locations, and evidence tags), and Investigations (with lifecycle status and outcomes), auto-refreshing on execution completion. The CLI executable (`offscript.mjs`) provides `offscript list` to inspect saved simulations and `offscript results <simulation-id>` for terminal output of findings, evidence references, and observations without opening a browser. Package distribution via `npm run build:local` and `npm pack` cleanly bundles compiled JS, Studio assets, and migrations decoupled from the installation path. Next: Milestone 7 — Reliability and evaluation.

### 7. Reliability and evaluation — implemented foundation

**Implemented:** robust session settlement, explicit interruption recovery, bounded observation deduplication, and a controlled multi-profile evaluation benchmark. The runtime `executionCoordinator` monitors session completion (`waitForIdle`), settles active agents and simulation aggregate to `completed` in SQLite, clears timers, and sets `record.phase = "completed"`. Interrupted simulations left after host restart/crash are reported as `interrupted` (`INTERRUPTED_BY_HOST_RESTART`) without automatic resumption, and can be explicitly settled to `failed` or `cancelled` by operators via `POST /api/simulations/:id/recover`, CLI (`offscript recover <id> [--cancel]`), or Studio. Exploration tools enforce bounded observation deduplication to prevent duplicate events and records for identical agent observations. The evaluation suite validates behavioral profiles, attributable evidence references, and finding corroboration criteria against a benchmark application with known defects. Next: Milestone 8 — Broader capabilities.

### 8. Broader capabilities — implemented foundation

**Implemented:** expanded the behavioral profile catalog across contracts, domain/application configuration, Studio selection, and prompt heuristics to support Regular (`sparrow`), Meticulous (`owl`), and Distrustful (`badger`) alongside Explorer (`raven`), Impatient (`fox`), and Beginner (`compass`). Profile-aware behavioral tendencies guide autonomous exploration prompts. Expanded browser interaction capabilities with `browser_scroll` (vertical page and element scrolling) and `browser_select` (dropdown option selection), integrated across Playwright Chromium sessions, browser tools, and orchestration execution. All additions respect strict target scope limits and authorization boundaries. Next: Milestone 9 — Visual evidence and live observability.

### 9. Visual evidence and live observability — implemented foundation

**Implemented:** visual screen evidence capture during autonomous exploration turns via Playwright Chromium (`session.screenshot()`) with credential sanitization (passwords unrevealed). Visual evidence is correlated with domain `Observation` entities (`evidenceIds`), persisted in a bounded local retention store (`.offscript/evidence/<simulationId>/<evidenceId>.png`), and served via authenticated Fastify route `GET /api/simulations/:id/evidence/:evidenceId` protected against path traversal. In Studio, interactive evidence badges open an accessible modal (`EvidencePreviewModal`) with full-resolution screenshot rendering. Execution status contracts and runtime coordinator track recent agent activity (`recentActivity`), streaming live interaction progress (`LiveActivityFeed`) directly into Studio's execution panel. Next: Milestone 10 — Multi-round session debate and deeper verification.

### 10. Multi-round session debate and deeper verification — next

Support multi-round collaborative debate between artificial users to stress-test hypotheses, refute false positives, and cross-examine evidence across different behavioral perspectives before finalizing finding assessments.

**Ready when:** collaboration protocols bound conversation rounds, prevent circular confirmation loops between agents with similar biases, and provide clear confidence grading for contested behaviors.

## How to use this map

1. Verify source and merge state, then choose one outcome from the next milestone.
2. Write a scoped implementation plan with observable acceptance criteria and relevant validation.
3. Implement only that plan, update the affected status/documentation, and follow the PR workflow.
4. Review what the result enables before selecting the next slice. Adjust ordering based on evidence; do not silently promote proposals to confirmed architecture.

The host foundation is implemented; see [LOCAL-HOST.md](LOCAL-HOST.md). Explicit simulation setup and operator control are the immediate next slice. Browser authorization must precede autonomous real-target actions. Useful CLI/Studio visibility can grow alongside runtime work. Collaboration, evidence, and reliability should deepen an already working exploration path rather than become disconnected infrastructure projects.
