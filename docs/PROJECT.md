# OFFSCRIPT

**Your users don't follow a script. Neither do ours.**

## Vision

OFFSCRIPT is a local-first multi-agent software exploration and testing platform. Autonomous artificial users explore real software, pursue goals, and collect evidence of unexpected behavior. It helps developers, QA engineers, and product teams find failures and usability problems that predefined test paths can miss.

Agents are not scripted test cases. Profiles influence exploration; they do not prescribe a fixed sequence or restrict who can discover a problem. Any agent can notice, investigate, or contribute evidence about any issue.

## Current implementation

Studio exists in `apps/studio`: React, TypeScript, Vite, React Router, and Tailwind CSS 4. Its only route is Home, displaying `offscript`. It has an FSD-oriented `app` and `pages` structure, `@/` imports, and CSS design foundations with system-aware light/dark themes and locally bundled Geist and IBM Plex Mono fonts.

There is no implemented CLI, agent runtime, browser exploration, persistence, investigation workflow, or CLI-to-Studio connection. Existing directories under `packages/` contain no files; their names do not establish approved module boundaries.

## Intended experience

A developer uses the CLI to configure a target, select profiles, authorize capabilities, and start a local exploration session. Studio will provide visibility into concurrent activity, shared observations, investigations, and evidence. Exact commands and screens remain undecided.

Initial exploration targets web applications with real backends in explicitly authorized environments. Browser actions may change real state: a run must respect the operator's scope and permissions. Local-first means local execution and local persistence are the baseline; it does not promise offline model inference or prevent an authorized target or model provider from using the network.

## Artificial user profiles

A profile describes personality, goals, available capabilities, permissions, and limitations. For example, an impatient first-time user may abandon unclear flows; a methodical user may compare outcomes across repeated attempts. Neither profile is an exclusive bug specialization.

Goals guide autonomous choices. Capabilities describe available tools. Permissions restrict allowed actions and targets. Limitations include resource budgets, incomplete knowledge, and model errors. Profile intent cannot override enforced tool policies.

Agents should explore concurrently and share useful observations. They may investigate related behavior collaboratively rather than independently repeating every discovery. Scheduling, shared-state ownership, and conflict handling remain implementation questions.

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
