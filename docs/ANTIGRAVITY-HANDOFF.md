# Antigravity restart prompt: finding-confirmation correctness

Use the following as a scoped implementation assignment. Read repository instructions first; this prompt does not authorize other roadmap work, live providers, browser execution, or publication.

## Context and scope

You are continuing OFFSCRIPT, a local-first multi-agent software exploration platform. Communicate with the user in Spanish and maintain project documentation in English. Read AGENTS.md, GEMINI.md, docs/PROJECT.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/CONSOLIDATION.md, docs/INVESTIGATIONS.md and docs/TESTING.md before changes. Inspect relevant source and actual dependency/configuration boundaries.

Check Git branch/status/log first. The last documentation correction was prepared on docs/consolidation-roadmap; its merge/commit state must be verified. Preserve all existing work, including uncommitted changes. Create a work branch if necessary. Do not assume the documentation patch fixed runtime behavior.

The immediate assignment is **C1 only: prevent unsupported finding confirmation**. Do not implement C2-C5, multi-round debate, new profiles, additional UI dashboards, provider configuration or a general policy engine. Record new out-of-scope findings without expanding the task.

Use the repository offscript-scoped-delivery skill and the relevant finding/evidence checks from offscript-boundary-review (see AGENTS.md). A separate full capability audit or approval round is not required to perform this already-scoped assignment.

## Required investigation

Inspect packages/contracts/finding-assessment.ts and its tests, contracts/result consumers, the investigation domain/result rules and relevant application boundary. Trace how Studio and CLI obtain and label findings. Verify source paths rather than copying nonexistent paths from earlier reports.

Reproduce the audited case: a completed supported investigation with distinct requester/assignee identities and a cited evidence ID, but an empty observation list, currently returns isConfirmedFinding=true. Existing passing tests do not invalidate that reproduction. Also inspect whether assignment alone is being interpreted as independent corroboration.

Before edits, briefly state the concrete behavior change and the affected boundary. Proceed with this scoped correction without asking for approval already supplied by this assignment. Ask only if a genuinely blocking product decision remains after inspecting the sources.

## Required behavior and boundaries

- Empty, missing or unverified supporting evidence must not produce a confirmed finding.
- Participant counts, assignment, completion authorship and a single LLM explanation do not establish independent corroboration.
- Preserve explicit provisional, inconclusive and refuted outcomes. If existing data cannot represent independent verification, fail closed to provisional and state that limitation; do not fabricate a verification record or debate workflow.
- A pure contracts evaluator must not read files, import SQLite/Playwright/Mozaik, or pretend an ID lookup proves artifact existence or semantic correctness. Identify any future artifact-verification application boundary without implementing unrelated infrastructure.
- Update Studio/CLI labels or validated results only where needed to avoid implying stronger verification than exists. Review compatibility and explain intentional changes to the previous weaker confirmation behavior.
- Preserve domain lifecycle rules, npm without workspaces, public module exports, strict TypeScript, FSD/@/ imports and semantic tokens. Keep source files within the project's modularity limits.

## Verification and documentation

Use focused tests for the unsupported-confirmation regression and meaningful corroboration/evidence failure cases. Review existing success assertions instead of treating weak confirmation criteria as requirements. Reuse validators and do not add a test per helper. Run the relevant contracts/application typechecks/tests and Studio lint/build if affected. Do not launch browsers or make live provider calls; report any unexecuted broader checks honestly. Honor mandatory hooks when later publication is explicitly requested.

Update only affected documentation. In CONSOLIDATION.md, describe the actual C1 behavior and remaining policy/data limitations; do not mark artifact integrity, autonomous execution or other items resolved. The next recommendation may be C2, but do not start it automatically.

## Completion report

Report changed files, the reproduction before/after, guarantees actually established, executed commands/results, compatibility changes and deferred work. State whether any case remains provisional because independent corroboration cannot be represented. Do not claim all findings are verified, all milestones complete, or the product autonomous because tests pass.

Stop after C1. Do not commit, push, open a PR, install dependencies, publish to npm, or proceed to another milestone unless the user separately requests it.
