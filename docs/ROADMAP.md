# Product roadmap

## Destination

A developer installs OFFSCRIPT through npm, authorizes an application and its backend, chooses artificial users and a goal, and starts an exploration. Users pursue goals concurrently through Mozaik, share observations, and investigate unexpected behavior. Studio and CLI expose attributable evidence, uncertainty, and termination reasons.

Users are not scripted tests. Profile, goal, tools, skills, permissions, and budgets have separate responsibilities. An observation, assignment, or supported hypothesis is not proof of a confirmed defect.

This map proposes outcomes, not permission to implement the full roadmap. Read [PROJECT.md](PROJECT.md), [ARCHITECTURE.md](ARCHITECTURE.md), and the source before planning. The current corrective backlog is [CONSOLIDATION.md](CONSOLIDATION.md).

## How status is determined

- **Implemented:** a reachable code path exists; this does not establish its safety or product value.
- **Integration-tested:** named checks exercise stated guarantees with controlled dependencies. Deterministic inference is useful here.
- **Product-validated:** an authorized, bounded run establishes the intended outcome with actual model decisions and an appropriate real target. Record evidence and limitations.
- **Partial / pending:** acceptance criteria remain open, even if related code or tests exist.

A test count, screenshot, merged PR, class named autonomous, or new prompt is not sufficient evidence to close a product milestone. Record what was verified, against which mode/target, and what remains unknown. Do not retrospectively describe a proposed policy as approved or implemented.

## Current position

Source audit baseline: `d063463`, 2026-10-31. Recheck working-tree and merge state before changing this table.

| Area | Existing implementation | Remaining acceptance gap |
| --- | --- | --- |
| Host and configuration | Local Fastify host, authenticated Studio, SQLite setup/create/read/list/delete, CLI archive, Vite URL suggestions and loopback checks. | End-to-end qualification of the installed product; managed target startup remains deferred. |
| Execution control | Explicit start/inspect/stop, aggregate lifecycle writes, budget cancellation, interruption detection and operator recovery. | Reliable settlement on persistence/closure failure, restart metadata, and truthful active-user reporting (C3). |
| Browser adapter | Playwright Chromium, isolated user contexts, semantic inspection, interaction tools, origin checks and screenshots. | Resource races, reference invalidation, capture budgets, action authorization and bounded privacy claims (C2/C4). |
| Mozaik exploration | Session factories, concurrent runtime integration, reactive investigations and profile instructions. | Normal CLI browser execution still defaults to deterministic inference; goal-driven decisions and all-user participation are not product-validated (C3/C5). |
| Investigations/findings | Request/assignment/completion use cases, CAS/outbox, result contracts and UI. | Confirmation can succeed without verified observation evidence; assignment is treated as corroboration (C1). |
| Evidence/results | Local PNG files, protected retrieval, result views and recent-activity polling. | Artifact existence/provenance, private caching, collision-safe paths and explicit retention semantics (C2). |
| Evaluation/catalog | Deterministic benchmark, six behavioral profiles and extended tools. | Benchmark does not prove autonomous discovery, independent corroboration, or behavioral differentiation. |

The project has progressed beyond setup into browser integration. It has not yet established the first trustworthy autonomous exploration. Consolidation takes priority over the former next step of multi-round debate.

## Delivery map and revised acceptance

| Milestone | Current status | Required outcome |
| --- | --- | --- |
| 1. Local runtime host | Implemented; integration checks exist. | Preserve resource ownership, local authentication and safe startup/shutdown. |
| 2. Setup and operator control | Implemented; reliability partial. | Start/inspect/stop and deletion remain consistent with storage and actual session closure. Resolve C3. |
| 3. Authorized browser interaction | Adapter implemented; authorization/resource hardening partial. | Establish supported target/action boundaries, isolated contexts, bounded captures and managed resources. Resolve C4 and relevant C2 items. |
| 4. First autonomous exploration of real software | Pending product validation. | Selected users pursue a concrete goal through live model decisions on an authorized app with a real backend, within enforced limits. Resolve C5. |
| 5. Collaborative investigation and evidence | Workflow implemented; confirmation/integrity incomplete. | Traceable independent support or refutation, available attributable artifacts, and honest uncertainty. Resolve C1/C2 before claiming confirmation. |
| 6. Usable CLI and Studio | Configuration/results paths implemented; full autonomous journey partial. | Installed archive supports the verified target-to-results path without fixture substitution or misleading states. |
| 7. Reliability and evaluation | Partial. | Fault-injected settlement, interruptions and artifacts are truthful; evaluate known defects and false positives using actual exploration. |
| 8. Broader capabilities | Six profiles and extra tools implemented; value unvalidated. | Expand only in response to demonstrated needs; do not equate catalog size with realistic behavior. |
| 9. Visual evidence and observability | Initial implementation. | Private, correctly attributed artifacts and accurate activity. Current transport is polling, not a streaming protocol. |
| 10. Multi-round debate and deeper verification | Deferred. | Reconsider after trustworthy individual exploration and independent verification exist; bound rounds and prevent circular confirmation. |

## Next scoped work

1. **C1: finding-confirmation correctness.** Prevent unsupported confirmation and communicate provisional results accurately. This is the first proposed implementation slice.
2. **C2: evidence integrity/privacy.** Resolve missing artifacts, actual page provenance, cache policy, path identity and retention.
3. **C3/C4: execution and browser hardening.** Plan these as separate bounded slices; preserve Mozaik integration and avoid another inference loop.
4. **C5: explicit provider configuration and first autonomous validation.** Require approved model/target access and record the evidence needed to qualify milestone 4.
5. Reassess later product work from that result instead of automatically continuing the list.

Read CONSOLIDATION.md for observed code paths and acceptance criteria. The ordering is a recommendation, not blanket authorization. Documentation updates do not fix runtime behavior.

## Later decisions

- Authenticated target sessions and safe secret provisioning; never reuse personal browser state implicitly.
- Explicit navigation versus resource-origin allowlists for frontend/backend deployments.
- Optional project service startup with authorization and process ownership.
- Additional interaction needs, skills, profiles, adapters, visual tooling and debate protocols.
- Versioned npm release/publication, retention/redaction policies and durable handler recovery.

Keep these visible as pending; do not create placeholder modules or tables. After each approved slice, report changed behavior, executed checks, limits and the next recommendation, then stop.
