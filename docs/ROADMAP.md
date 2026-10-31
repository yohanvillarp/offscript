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

Source audit baseline: `d063463`, 2026-10-31. Subsequent corrective commits merged through PR #28 record C1-C3 as resolved in CONSOLIDATION.md. The tables summarize acceptance areas and recorded corrections; baseline C1-C3 gaps are not a request to reimplement the fixes. Verify their current behavior during release qualification. C4-C5 and autonomous product validation remain open.

| Area | Existing implementation | Remaining acceptance gap |
| --- | --- | --- |
| Host and configuration | Local Fastify host, authenticated Studio, SQLite setup/create/read/list/delete, CLI archive, Vite URL suggestions and loopback checks. | End-to-end qualification of the installed product; managed target startup remains deferred. |
| Execution control | Explicit start/inspect/stop, aggregate writes, interruption recovery and C3 settlement corrections. | Requalify failure/closure behavior for the release; exact historical execution metadata is not durably retained. |
| Browser adapter | Playwright Chromium, user contexts, semantic tools, screenshots and recorded single-launch deduplication. | Stale-reference handling, capture budgets, action authorization and bounded privacy claims remain under C4. |
| Mozaik exploration | Session factories, concurrent runtime integration, reactive investigations and profile instructions. | Normal CLI browser execution still defaults to deterministic inference; goal-driven decisions and all-user participation are not product-validated (C3/C5). |
| Investigations/findings | Request/assignment/completion, CAS/outbox, result UI and conservative C1 confirmation corrections. | Qualify corrected evidence/corroboration behavior without claiming fully validated autonomous discovery. |
| Evidence/results | Local PNGs, protected retrieval, result views, activity polling and recorded C2 integrity/privacy corrections. | Files and SQLite are not a two-phase atomic transaction; general optical redaction and broad retention policy remain limited. |
| Evaluation/catalog | Deterministic benchmark, six behavioral profiles and extended tools. | Benchmark does not prove autonomous discovery, independent corroboration, or behavioral differentiation. |

The project has progressed beyond setup into browser integration. It has not yet established the first trustworthy autonomous exploration. Consolidation takes priority over the former next step of multi-round debate.

## Delivery map and revised acceptance

| Milestone | Current status | Required outcome |
| --- | --- | --- |
| 1. Local runtime host | Implemented; integration checks exist. | Preserve resource ownership, local authentication and safe startup/shutdown. |
| 2. Setup and operator control | Implemented, with C3 corrections recorded. | Requalify start/inspect/stop/deletion and closure consistency for the release. |
| 3. Authorized browser interaction | Adapter and C2/C3 corrections implemented; C4 partial. | Keep action boundaries, stale references, budgets and supported network behavior explicit. |
| 4. First autonomous exploration of real software | Pending product validation. | Selected users pursue a concrete goal through live model decisions on an authorized app with a real backend, within enforced limits. Resolve C5. |
| 5. Collaborative investigation and evidence | Workflow and C1/C2 corrections implemented. | Regression-check conservative classification and artifact provenance; do not equate corrected classification with proven independent discovery. |
| 6. Usable CLI and Studio | Configuration/results paths implemented; full autonomous journey partial. | Installed archive supports the verified target-to-results path without fixture substitution or misleading states. |
| 7. Reliability and evaluation | Partial. | Fault-injected settlement, interruptions and artifacts are truthful; evaluate known defects and false positives using actual exploration. |
| 8. Broader capabilities | Six profiles and extra tools implemented; value unvalidated. | Expand only in response to demonstrated needs; do not equate catalog size with realistic behavior. |
| 9. Visual evidence and observability | Initial implementation. | Private, correctly attributed artifacts and accurate activity. Current transport is polling, not a streaming protocol. |
| 10. Multi-round debate and deeper verification | Deferred. | Reconsider after trustworthy individual exploration and independent verification exist; bound rounds and prevent circular confirmation. |

## Next scoped work: public release preparation

The operator has chosen a feature freeze for the hackathon and preparation of `@nikelyh/offscript` 1.0.0. Follow [RELEASE.md](RELEASE.md) for package qualification, README/graphics, versioning/automation, documentation hosting and post-release patches. This is a planned release, not an already published package or deployed website.

1. Complete the personal-context cleanup while keeping technical documentation and limitations public (PUBLIC-CONTENT.md).
2. Prepare a clean package artifact, public identity/metadata, executable installation steps, README and judging evidence; qualify the exact archive before stable publication.
3. Introduce single-package Changesets and controlled GitHub release jobs through separate reviewed changes, then publish only with maintainer authorization.
4. Build the static documentation site under apps/docs and deploy offscript.nikelyh.tech independently of the local runtime/npm package.
5. Verify the published version and release small, tested patches for concrete issues. Do not automatically resume feature milestones.

C1-C3 corrective work is recorded in CONSOLIDATION.md and should be regression-checked rather than reopened without evidence. C4 browser/action-policy limits and C5 live autonomous exploration remain deferred and must be disclosed accurately. Feature freeze does not authorize false readiness claims or skipping essential pre-release installation/privacy checks. Reassess deferred work after the hackathon instead of moving directly into multi-round debate.

## Later decisions

- Authenticated target sessions and safe secret provisioning; never reuse personal browser state implicitly.
- Explicit navigation versus resource-origin allowlists for frontend/backend deployments.
- Optional project service startup with authorization and process ownership.
- Additional interaction needs, skills, profiles, adapters, visual tooling and debate protocols.
- Versioned npm release/publication, retention/redaction policies and durable handler recovery.

Keep these visible as pending; do not create placeholder modules or tables. After each approved slice, report changed behavior, executed checks, limits and the next recommendation, then stop.
