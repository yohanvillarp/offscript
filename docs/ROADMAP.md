# Product roadmap

## Destination

A developer installs OFFSCRIPT through npm, authorizes a real application and its backend, chooses artificial users and a goal, and starts an exploration. Users with different behaviors act concurrently through Mozaik, share observations, and investigate unexpected behavior. Studio makes activity, evidence, and outcomes understandable. The CLI starts and manages the local experience.

Users pursue outcomes rather than scripted steps. A profile influences behavior, not which problems an agent is allowed to discover. Tools, skills, effective permissions, and execution limits remain separate concerns. An observation or a supported hypothesis is not automatically a confirmed finding.

This is a proposed sequence of outcomes, not authorization to implement the whole roadmap. Individual milestones require their own scoped plan. No dates, endpoints, package trees, or database schemas are committed here. [PROJECT.md](PROJECT.md) defines the product; [ARCHITECTURE.md](ARCHITECTURE.md) defines confirmed boundaries.

## Starting point

Status describes the inspected source, not deployment or GitHub merge state. Check the current branch and PRs before beginning a milestone.

| Area | Implemented | Remaining gap |
| --- | --- | --- |
| Domain and contracts | Simulation/agent lifecycles, validated events, shared setup/configuration contracts, and execution status contracts with controlled-demo and browser-exploration modes. | Investigation result application cases and broader session policies. |
| Mozaik | Concurrent controlled agents, enforced fixture and browser tool permissions, mapped events, reactive assignment, controlled demo execution factory, and autonomous browser exploration session factory. | Collaborative investigations and live provider inference in production. |
| Browser automation | Playwright Chromium adapter in packages/browser, target scope enforcement, opaque element handles, semantic ARIA snapshots, sanitized credentials, isolated user contexts, and autonomous exploration loop with profile-specific instructions. | Visual screen captures and broader non-web targets. |
| Persistence and delivery | SQLite snapshots/configuration, atomic setup creation, atomic aggregate lifecycle updates, investigation outbox, observations recorded from browser exploration, and optional SQLite-backed Mozaik sessions. | Durable handler recovery, operational retention, and broader production composition. |
| Studio | Design system, connected setup with project recognition, initial Vite URL suggestions, explicit local availability checks, compact saved configurations with a detail panel, three profiles, editable limits, and execution controls for both controlled demo and browser exploration. | Live browser activity streams, evidence previews, and investigation views. |
| Local product entry | Protected Fastify health and execution routes, local host lifecycle, shared dispatch, development entry, local npm archive launcher, and multi-mode execution coordination (controlled-demo and browser-exploration). | Published package distribution and collaborative investigation CLI workflows. |


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

### 5. Collaborative investigation and evidence — next

Extend the existing request/assignment foundation with investigation results and completion application behavior. Connect evidence to observations and hypotheses, support collaborative contributions, and make supported, contradicted, and inconclusive assessments understandable. Define confirmation criteria before presenting confirmed findings.

**Ready when:** an unexpected behavior can lead to a shared investigation with attributable evidence and a traceable result. Any user can discover it; expertise does not grant exclusive discovery rights. A recorded conclusion must communicate its uncertainty.

### 6. Usable CLI and Studio workflow

Complete the journey from project setup to reviewing results. Connect saved simulations, user activity, observations, investigations, and evidence to Studio. Finish project-relative configuration and npm packaging, deciding local/global installation behavior and target URL suggestions without relying on the installation directory.

**Ready when:** a developer can install OFFSCRIPT, configure an authorized target, run an exploration, and inspect its results through the CLI and Studio without editing internal files. The interface reflects actual backend capabilities.

Thin CLI/Studio integration begins in milestone 2; this milestone completes the experience rather than postponing all interface work until the end.

### 7. Reliability and evaluation

Improve interruption handling, explicit recovery decisions, duplicate processing protection, budgets, diagnostics, evidence retention/redaction, and cross-platform packaging. Evaluate real exploration quality, behavioral differences, evidence usefulness, and misleading conclusions on controlled applications with known issues.

**Ready when:** supported failure modes and recovery limits are documented and tested, and product quality can be assessed beyond a successful demo. Resilience begins in every milestone; automatic resumption requires its own approved design.

### 8. Broader capabilities — later

Expand skills, tools, behavioral profiles, focused evaluation intentions, and software adapters when validated use cases justify them. The remaining candidate profiles are Regular, Distrustful, Meticulous, Adaptive, and Collaborative. Refine Adaptive around explicit interaction needs rather than treating it as a universal accessibility profile.

**Ready when:** each addition has a clear user need, preserves authorization boundaries, and fits replaceable adapters without coupling domain logic to infrastructure. Non-web targets and richer collaboration remain future capabilities, not initial release requirements.

## How to use this map

1. Verify source and merge state, then choose one outcome from the next milestone.
2. Write a scoped implementation plan with observable acceptance criteria and relevant validation.
3. Implement only that plan, update the affected status/documentation, and follow the PR workflow.
4. Review what the result enables before selecting the next slice. Adjust ordering based on evidence; do not silently promote proposals to confirmed architecture.

The host foundation is implemented; see [LOCAL-HOST.md](LOCAL-HOST.md). Explicit simulation setup and operator control are the immediate next slice. Browser authorization must precede autonomous real-target actions. Useful CLI/Studio visibility can grow alongside runtime work. Collaboration, evidence, and reliability should deepen an already working exploration path rather than become disconnected infrastructure projects.
