# OFFSCRIPT

**Your users don't follow a script. Neither do ours.**

## Vision

OFFSCRIPT is a local-first multi-agent software exploration and testing platform. Autonomous artificial users pursue goals in real software and collect attributable evidence of unexpected behavior. Developers, QA engineers, and product teams use it to investigate failures and usability problems that predefined test paths can miss.

Agents are not scripted test cases. A behavioral profile influences decisions; it does not dictate a fixed sequence or restrict which agent can discover a problem. Any user may notice or investigate any issue.

## Current product and validation boundary

The repository implements a local CLI/Studio configuration and results workflow, SQLite persistence, Mozaik coordination, a Playwright browser adapter, investigations, and initial visual evidence. **The normal browser-exploration CLI path currently uses a deterministic runner.** It can interact with real pages, but its scripted decisions do not demonstrate autonomous goal pursuit or profile-dependent behavior. Programmatic runner injection and an opt-in live demo are not a complete operator-facing provider setup.

Read [CONSOLIDATION.md](CONSOLIDATION.md) for verified gaps, source references, and proposed acceptance criteria. The first corrective slice is finding-confirmation correctness. [ROADMAP.md](ROADMAP.md) distinguishes implemented code, integration checks, and product validation; multi-round debate is deferred.

| Area | Existing behavior |
| --- | --- |
| CLI/distribution | `studio`, `serve`, help/version, `--no-open`, local `npm pack` archive, `list`, `results`, and explicit interruption recovery. The npm package remains private/unpublished. |
| Studio | React/Vite/Tailwind with FSD, `@/` imports, semantic light/dark tokens, Space Grotesk and JetBrains Mono. Compact configurations, a responsive simulation/user detail panel, target links, inline deletion confirmation, execution controls, result views and evidence preview. |
| Setup | First-visit raven introduction, reopenable help, Target/Users/Configuration summary, project/name recognition, unverified simple Vite URL suggestions, explicit loopback checks, shared goal and stored limits. Unsaved drafts stay in memory; saved records use project storage. |
| Domain/application | Immutable simulation/agent lifecycles, observations, collaborative investigations, initial configuration creation/deletion, investigation request/assignment/completion and explicit interrupted-record recovery. |
| Persistence/runtime | SQLite/Drizzle snapshots, optimistic writes, transactional investigation outbox, protected local Fastify host, shared dispatch and explicit session factories. Startup never reconstructs agents automatically. |
| Browser/orchestration | Playwright Chromium, one user context per artificial user, semantic inspection and interaction tools, screenshots, Mozaik sessions and reactive investigations. Browser mode defaults to deterministic inference. |

Execution completion, evidence integrity, secret handling and finding confirmation have unresolved correctness/validation gaps. Their existence in the UI or contracts must not be presented as guarantees already established. Recent activity is polled, not delivered through a streaming protocol. Target service startup, a skills system, general action-policy enforcement and automatic agent resumption remain unimplemented.

## Intended experience

A developer selects a local project, authorizes a target and action scope, chooses artificial users and a concrete goal, configures model access and budgets, and starts a bounded exploration. Users act concurrently through Mozaik and share useful observations rather than independently repeating every discovery. Studio and CLI explain actual actions, evidence, uncertainty, and termination reasons.

Initial real exploration targets web applications with real backends in explicitly authorized environments. The application must be accessible for exploration; saving configuration does not require it to be running. A configured URL, successful connection check, or same-origin browser restriction does not authorize every business action.

Local-first means local execution/storage are the baseline. It does not promise offline model inference or prohibit authorized network use. Secrets and target content must not become privileged model instructions. The target project is resolved independently of the CLI installation directory.

## Artificial user profiles

| Profile | Avatar identity | Behavior and general intention |
| --- | --- | --- |
| Explorer | Raven | Curious and experimental; understands software by trying alternative paths. |
| Impatient | Fox | Fast and result-oriented; retries or seeks alternatives when progress feels slow. |
| Beginner | Compass | Needs orientation; learns without prior product knowledge. |
| Regular | Sparrow | Practical and habitual; expects familiar workflows. |
| Meticulous | Owl | Attentive and precise; checks details and resulting state. |
| Distrustful | Badger | Cautious and skeptical; questions unexpected requests and disclosures. |

All six exist in selection/contracts/instructions. Their behavioral differentiation is not established by deterministic tests. Distinct artwork is unfinished: Sparrow/Compass, Owl/Raven and Badger/Fox currently reuse identical assets. Adaptive and Collaborative remain candidates; Adaptive needs explicit interaction needs rather than representing every accessibility experience.

Avatar identity is presentation metadata, not a permission or specialization. An agent conceptually combines profile, assigned goal and skills, subject to tools, externally enforced permissions and limits:

- **Profile:** how the user approaches software.
- **Goal:** a concrete desired outcome, shared or individual, not scripted steps.
- **Skills:** reusable knowledge/procedures; no authorization is implied.
- **Tools/capabilities:** available operations and declarations, distinct from effective permissions.
- **Permissions/limits:** operator-authorized targets/actions and budgets that model decisions cannot expand.

The existing domain `AgentProfile` groups personality, goals and capabilities. The conceptual distinction above does not claim separate skill or policy entities already exist. Preserve that shape unless a scoped change requires otherwise.

## Lifetimes and collaboration

Domain session state, artificial-user participation, runtime membership, inference turns and goal achievement are distinct. The domain start operation leaves agents ready; the current execution coordinator separately transitions selected users to running, then starts only the first goal turn. Peers may be activated through investigation reactions. This is not evidence that all selected users explore independently from the start.

A model answer ends a turn, not proof of success or defect discovery. `completed` means a session outcome with settled participation, not exhaustive coverage. Current automatic idle settlement and error handling require C3 consolidation. Domain cancellation cannot itself abort a browser or provider request; Mozaik `leave` does not establish provider cancellation.

The domain/application investigation workflow supports requests, multiple assigned collaborators without an exclusive leader, and completion by an assigned author. Authorship and assignment do not establish consensus. SQLite/outbox delivery preserves committed facts but does not restore interrupted agent work or guarantee asynchronous handler completion.

## Evidence and confidence

| Concept | Meaning |
| --- | --- |
| Observation | Recorded behavior with provenance; it does not assert a defect. |
| Suspicion | A hypothesis that behavior may be problematic. |
| Investigation | A focused effort to gather support or contradiction. |
| Confirmed finding | A conclusion meeting an explicit verification policy, beyond an LLM assertion or collaborator roster. |

Browser observation recording attempts viewport screenshots under `.offscript/evidence`, and Studio can request them through authenticated routes. Current references do not guarantee artifact existence, independent verification, accurate page provenance, retention, or complete redaction. The existing finding evaluator can overconfirm; its `isConfirmedFinding` output is not yet a trustworthy verification guarantee. See CONSOLIDATION.md and [INVESTIGATIONS.md](INVESTIGATIONS.md).

## Non-goals and future work

No hosted multi-tenant service, mandatory cloud control plane, universal software support, unrestricted destructive testing, autonomous privilege escalation, or guaranteed defect discovery is promised. OFFSCRIPT complements deterministic regression tests.

Prioritize the first trustworthy autonomous exploration before new profile catalogs, visual tooling or debate protocols. Additional target adapters, managed application startup, secure authentication setup, npm publication and durable recovery require separate scoped decisions. Completing one task never authorizes automatic implementation of the rest of the roadmap.
