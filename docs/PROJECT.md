# OFFSCRIPT

**Your users don't follow a script. Neither do ours.**

## Vision

OFFSCRIPT is a local-first multi-agent software exploration and testing platform. Autonomous artificial users explore real software, pursue goals, and collect evidence of unexpected behavior. It helps developers, QA engineers, and product teams find failures and usability problems that predefined test paths can miss.

Agents are not scripted test cases. Profiles influence exploration; they do not prescribe a fixed sequence or restrict who can discover a problem. Any agent can notice, investigate, or contribute evidence about any issue.

## Current implementation

Studio exists in `apps/studio`: React, TypeScript, Vite, React Router, and Tailwind CSS 4. The home route displays Simulations with an empty history and an introductory guide. The New simulation action opens `/simulations/new`: a first-visit mascot introduction followed by a three-step draft editor for Target, Users, and Configuration summary. Target and Users use centered forms without a sidebar; the final summary displays the target and selected participant avatars and names. The shared navbar contains a persistent Simulations link, a collapsible mobile menu, and subtle navigation transitions that respect reduced motion. A reusable vector raven mascot provides restrained, presentation-only animation states with reduced-motion support. Interface icons use Lucide; the brand mark and mascot remain custom SVGs. Entering configuration remembers introduction completion in browser local storage; subsequent visits open Target directly. A question-mark help button reopens the introduction and returns to the current step without discarding the draft. If storage is unavailable, configuration still works but the preference cannot persist. Only this preference is stored; drafts exist only in React state while the editor is mounted; changing steps retains them, but leaving or reloading discards them. Setup supports multiple selection from three initial behavioral profiles (Raven / Explorer, Fox / Impatient, Compass / Beginner) and inline validation. Target includes a required shared Exploration goal, describing an outcome rather than scripted steps; Configuration summary repeats it for all selected users. This goal remains in the UI draft and is not yet assigned to domain agents. The user selector uses compact avatar/profile options with a separate, keyboard-accessible “About this user” disclosure for descriptions and motivations; the summary shows avatars, names, and profiles. These remain presentation metadata, without executable profile configuration, runtime goal assignment, tools, skills, or permissions. Execution, saved configurations, permission enforcement, and data loading are not connected. It has an FSD-oriented `app` and `pages` structure, `@/` imports, and CSS design foundations with system-aware light/dark themes and locally bundled Space Grotesk for interface typography and JetBrains Mono for technical labels, identifiers, paths, and code.

There is no implemented CLI, agent runtime, browser exploration, persistence, investigation workflow, or CLI-to-Studio connection. The domain foundation in `packages/domain` implements immutable simulation and agent models, profiles, declared capabilities, environment classification, and lifecycle validation with unit tests. The lifecycle contract foundation in `packages/contracts` provides versioned, validated events and serializable simulation/agent summaries; no event processing is implemented. Other directories under `packages/` remain empty scaffolding; their names do not establish approved module boundaries.

## Intended experience

A developer uses the CLI to configure a target, select profiles, authorize capabilities, and start a local exploration session. Studio will provide visibility into concurrent activity, shared observations, investigations, and evidence. Exact commands and screens remain undecided.

Initial exploration targets web applications with real backends in explicitly authorized environments. Browser actions may change real state: a run must respect the operator's scope and permissions. Local-first means local execution and local persistence are the baseline; it does not promise offline model inference or prevent an authorized target or model provider from using the network.

## Artificial user profiles

A behavioral profile describes personality, experience, decision-making tendencies, and general motivation. It does not prescribe a sequence of steps or limit who can discover a problem. Profiles may represent everyday users or focused evaluation intentions.

### Initial profiles

| Profile | Avatar | Behavior | General intention |
| --- | --- | --- | --- |
| Explorer | Raven | Observant, curious, and experimental; tries alternative paths and questions unexpected results. | Understand the system through exploration. |
| Impatient | Fox | Quick, resourceful, and focused on results; retries or finds alternatives when progress feels slow. | Complete tasks as quickly as possible. |
| Beginner | Compass | Needs guidance and interprets instructions without prior product knowledge; may make choices the developer did not anticipate. | Learn to use the product and accomplish a goal. |

Avatar and behavior are separate concepts: changing an illustration must not change the profile's semantics. These mappings are the initial product selection, not bug specializations or runtime instructions.

An agent conceptually combines a behavioral profile, an assigned goal, and available skills, subject to externally enforced permissions and execution limits. These concerns have distinct responsibilities:

- **Profile:** how an artificial user approaches software and makes decisions.
- **Goal:** a concrete desired outcome for a simulation, such as purchasing a product. All three profiles may pursue the same goal differently; a general motivation such as speed is not that assigned goal.
- **Skills:** reusable knowledge or procedures for using capabilities; skills do not themselves grant tools or authorization.
- **Tools and declared capabilities:** available operations and capability declarations, separate from behavior and effective authorization.
- **Permissions and limits:** operator-controlled action/target restrictions and execution budgets. An agent cannot expand these through its decisions, profile, or skills.

The existing domain `AgentProfile` currently groups personality, goals, and declared capabilities. That implemented shape remains unchanged; the conceptual separation above does not claim separate domain entities, a skill system, or policy enforcement already exist.

The broader candidate catalog includes Beginner, Impatient, Explorer, Regular, Distrustful, Meticulous, Adaptive, and Collaborative. Only the three initial profiles above are included in Studio. The others remain deferred; Adaptive requires more precise interaction needs or modalities before implementation and must not stand in for every accessibility experience.

Agents should explore concurrently and share useful observations. They may investigate related behavior collaboratively rather than independently repeating every discovery. Mozaik will provide concurrent, event-driven collaboration. OFFSCRIPT must define shared-state ownership and conflict handling without duplicating its inference/tool loop. These integration details remain unimplemented.

## Simulation and agent lifetimes

A simulation is an exploration session. Each artificial user has a participation lifecycle within it and may take multiple inference turns. Starting a session does not automatically activate every agent; receiving a model answer does not end that agent's participation.

A completed simulation means the session ended with all agent participations settled, not that every goal was achieved or the target has no defects. Failed or cancelled participations can coexist with a completed session. Ending due to a time or resource budget may be a normal product outcome; budget enforcement and outcome assessment are not implemented.

Runtime membership is separate from this roster of artificial users: observers and other runtime participants need not be domain agents. Domain cancellation records a logical state; it does not itself stop browser actions or model requests.

## Evidence and confidence

| Concept | Meaning |
| --- | --- |
| Observation | A recorded event or behavior, without claiming it is a defect. |
| Suspicion | A hypothesis that observed behavior may be problematic. |
| Investigation | A focused effort to test a hypothesis and gather supporting or contradictory evidence. |
| Confirmed finding | A supported conclusion meeting an explicit confirmation policy; not merely an LLM assertion. |

For example, one user sees a saved item disappear after reload. Another agent can investigate persistence and gather evidence from a separate session. This begins as an observation and suspicion; confirmation requires an agreed evidence standard. These are conceptual distinctions, not an approved database schema or fixed workflow.

## Planned scope and future capabilities

The planned foundation includes authorized browser exploration, concurrent coordination, shared observations, investigation and evidence management, local persistence, and CLI/Studio visibility. Adapters should allow future support for other software types without coupling the domain to browser tooling. Additional target types and richer collaboration can be considered after the initial web workflow; no delivery order is implied.

## Initial non-goals

- A hosted multi-tenant service or required cloud control plane.
- Universal support for all software types in the first implementation.
- Unrestricted destructive testing or autonomous privilege escalation.
- Guaranteed exhaustive coverage, guaranteed defect discovery, or replacement of deterministic regression tests.
- Automatic implementation of this roadmap during unrelated tasks.
