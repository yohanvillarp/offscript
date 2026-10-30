# Product roadmap

## Destination

A developer installs OFFSCRIPT through npm, authorizes a real application and its backend, chooses artificial users and a goal, and starts an exploration. Users with different behaviors act concurrently through Mozaik, share observations, and investigate unexpected behavior. Studio makes activity, evidence, and outcomes understandable. The CLI starts and manages the local experience.

Users pursue outcomes rather than scripted steps. A profile influences behavior, not which problems an agent is allowed to discover. Tools, skills, effective permissions, and execution limits remain separate concerns. An observation or a supported hypothesis is not automatically a confirmed finding.

This is a proposed sequence of outcomes, not authorization to implement the whole roadmap. Individual milestones require their own scoped plan. No dates, endpoints, package trees, or database schemas are committed here. [PROJECT.md](PROJECT.md) defines the product; [ARCHITECTURE.md](ARCHITECTURE.md) defines confirmed boundaries.

## Starting point

Status describes the inspected source, not deployment or GitHub merge state. Check the current branch and PRs before beginning a milestone.

| Area | Implemented | Remaining gap |
| --- | --- | --- |
| Domain and contracts | Simulation/agent lifecycles, profiles, observations, investigations, and validated semantic events. | Executable simulation management and investigation result application cases. |
| Mozaik | Concurrent controlled agents, enforced fixture-tool permissions, mapped events, and reactive assignment. | Autonomous use of real software and a complete operator-controlled session lifecycle. |
| Persistence and delivery | SQLite snapshots, migrations, optimistic revisions, transactional investigation outbox, and optional SQLite-backed Mozaik sessions. | Durable handler recovery, operational retention, and broader production composition. |
| Studio | Design system, simulations screen, and a three-step configuration draft with three user profiles. | Runtime connection, saved configuration, activity, evidence, and results. |
| Local product entry | Protected Fastify health routes, local host lifecycle, shared dispatch, development entry, and deterministic runtime demo. | Simulation-control services, CLI, and npm distribution. |

The current demo uses a simulated cart and deterministic inference. It does not explore an actual application. Transactional dispatch does not restore agent work or acknowledge handler completion.

## Suggested milestones

### 1. Local runtime host — implemented foundation

Compose the existing application, SQLite, outbox, and explicitly prepared Mozaik sessions under a local host. Use the approved Fastify direction for the server boundary. Establish configuration, resource ownership, startup/shutdown, and local access protection before exposing control operations.

**Implemented:** one local process starts, reports health, and shuts down with preserved data and explicit timeout/error handling. Stored state does not reactivate agents. This foundation is covered by local automated tests; distribution and Studio integration remain later work.

### 2. Simulation setup and operator control — next

Connect target configuration, concrete goals, selected behavioral profiles, model configuration, permissions, and budgets to actual simulations. Define how an operator starts and stops exploration and how interruptions are represented. Add the minimum CLI entry and Studio visibility needed to operate the host, without waiting for a complete interface.

**Ready when:** a configured simulation can be deliberately started, observed, and stopped against the controlled fixture, with session state kept distinct from individual turns and goal achievement.

The initial users remain Explorer/Raven, Impatient/Fox, and Beginner/Compass. Do not turn their avatars into tool permissions or bug specializations, or refactor the domain profile shape solely to match the conceptual model.

### 3. Authorized browser interaction

Introduce the Playwright adapter for web applications with real backends. Provide bounded browser interaction and attributable observations. Establish browser/session isolation and enforce target scope, allowed actions, credential handling, and destructive-action restrictions at the tool boundary.

**Ready when:** an authorized test application can be inspected and interacted with through tools, prohibited actions are rejected, and useful evidence can be attributed to the acting user. Target content must remain untrusted input.

### 4. First autonomous exploration of real software

Connect supported model inference and the initial profiles to the authorized browser tools through Mozaik's existing loop. Let multiple artificial users pursue a goal differently, react to actual application feedback, and record unexpected behavior within operator-defined limits.

**Ready when:** a developer can run a bounded exploration of an authorized application with a real backend and see independent behavior from multiple users, useful observations, and a clear termination reason. The path must not be a disguised scripted test.

This is the first meaningful product demonstration. Keep it narrow: one supported target type, the initial profiles, a small tool set, and basic visibility. Do not delay it for a full skills catalog, elaborate dashboards, or automatic recovery.

### 5. Collaborative investigation and evidence

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
