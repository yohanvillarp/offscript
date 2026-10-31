# Consolidation and readiness gaps

## Scope and evidence

Source audit on 2026-10-31, baseline `d063463` (after PRs #14–27). This is a record of observed gaps and proposed acceptance criteria, not a claim that fixes are implemented or authorization to implement every item. Recheck source and Git state before using it.

The browser adapter and Mozaik integration exist. The normal CLI composes `createMultiModeSessionFactory()` without a supplied runner; `browser-exploration-factory.ts` defaults to `deterministicBrowserRunner()`. Real browser interaction is therefore implemented, but the default decision sequence remains scripted. Autonomous goal pursuit and behavioral differentiation are not established by this path.

Audit verification: orchestration production/test typechecks and four existing finding-assessment tests passed. An additional in-memory call to `evaluateFindingAssessment` returned `isConfirmedFinding: true` for a supported investigation with two participant identities, a nonexistent evidence reference, and an empty observation list. No browser, live provider, or complete pipeline was run for that audit. The existing benchmark manually constructs part of its finding assessment; it does not establish independent defect discovery.

## C1 — Finding confirmation: first corrective slice (Resolved)

**Resolved behavior:** `packages/contracts/finding-assessment.ts` now enforces strict corroboration and evidence verification. Empty observations (`[]`), absent evidence (`[]`), or unverified evidence IDs fail closed to `isConfirmedFinding: false`, `confidence: "provisional"` with an explicit `uncertaintyReason`. Corroboration requires verified observations contributed by at least two distinct artificial users (e.g. initiating observation author and completing evidence observation author); participant lists, assignment rosters, or completion authorship alone fail closed to provisional. The audit reproduction case now returns provisional status.

**Remaining limitations:** The evaluator is a pure contract classifier: it verifies evidence reference membership in known simulation observations, but does not perform filesystem artifact existence, integrity, or page-level semantic verification (deferred to C2). Autonomous defect discovery and behavioral differentiation remain unproved (C4/C5).

## C2 — Evidence integrity and privacy (Resolved)

**Resolved behavior:** `tools/browser-exploration-tools.ts` dynamically binds observation location provenance to the active page context URL via `browserSession.getCurrentUrl()`. Failure injection during capture or storage leaves the observation honestly recorded with `evidenceIds: []`, preventing unverified ghost evidence references. `runtime/evidence-store.ts` validates identifiers against `^[a-zA-Z0-9_-]+$` ensuring path confinement and collision resistance; eviction policy removes the oldest files by recorded timestamp (`mtimeMs`, FIFO); and scoped reads strictly isolate simulations without aliasing. `server/configuration-routes.ts` enforces `Cache-Control: private, no-cache, no-store, must-revalidate`. `browser/session.ts` documents that screenshots capture in-scope rendered viewports with native HTML password masking, without claiming universal optical text/canvas redaction.

**Remaining limitations:** Local filesystem screenshot storage and SQLite database observation writes are decoupled and not two-phase atomic; orphaned files from aborted commits are reclaimed upon simulation deletion. Browser concurrency, tool boundaries, and autonomous exploration remain open (C4–C5).

## C3 — Truthful execution settlement (Resolved)

**Resolved behavior:** `runtime/execution-settlement.ts` now handles persistence conflicts and SQLite storage failures explicitly via a typed `SettlementResult`. Injected SQLite storage write failures during settlement transition the coordinator to `phase: "failed"` with `failureReason: "SETTLEMENT_STORAGE_FAILED"` instead of reporting false completion. Session close failures are trapped and transition to `phase: "failed"` with `failureReason: "SESSION_CLOSE_FAILED"`. `monitorSettlement` inspects `snapshot.failures` from `session.waitForIdle()`; sessions with recorded tool or inference crashes fail closed to `phase: "failed"` (`SESSION_EXECUTION_FAILED_*`). All selected artificial users receive their initial goal turn invocation on `start()`. During running execution, `activeAgents` dynamically reflects participating agents; upon terminal settlement or host restart inspection, `activeAgents` resolves truthfully to `[]`. Host restart inspection preserves `phase: "interrupted"` with `failureReason: "INTERRUPTED_BY_HOST_RESTART"` without fabricating a default `controlled-demo` mode or activity records. Single-browser launch concurrency in `browser-manager.ts` now deduplicates concurrent initial context requests via a shared pending launch promise, preventing orphaned Chromium processes.

**Remaining limitations:** Durable execution metadata (exact completed turn count and start mode) is not persisted in a separate execution ledger across restarts; interrupted simulations require explicit operator recovery. Element epoch revalidation, destructive action classification, operator safety policies, and model-driven exploration remain open (C4–C5).

## C4 — Browser boundaries and resource ownership

**Observed:** `browser-manager.ts` has no shared pending launch promise, so concurrent initial session requests can launch multiple browsers while retaining only one browser handle. Element epochs change on explicit navigation/inspection, not every DOM mutation; references live in page-controlled attributes. ARIA output and the complete element catalog lack a complete capture budget. Origin checks and tool-name allowlists do not classify destructive business actions or constitute an operator action policy.

**Required outcome:** verify and enforce single ownership across launch, failure, and close races; define stale-reference handling accurately. Specify bounded captures, authorized navigation/resource origins, and minimal operator-approved action scope. Cover the actual network mechanisms used by supported targets before claiming complete network isolation. Do not build a speculative universal policy engine.

**Acceptance:** concurrency/resource checks cannot leave unmanaged Chromium instances; stale references are revalidated or rejected according to an explicit contract; disallowed effects are denied at the tool boundary, not merely discouraged in prompts. Browser tests require the task's explicit authorization; source review/typechecks do not establish browser behavior.

## C5 — First verified autonomous exploration

**Prerequisites:** the relevant C1–C4 safety/truthfulness gaps have been addressed and the operator authorizes the target and model calls.

**Proposed slice:** explicit provider/model configuration and secret handling, a clear separation of deterministic fixture mode from model-driven execution, and bounded goal pursuit by the selected artificial users on an authorized application with a real backend. Continue using Mozaik's loop. Keep the deterministic runner for integration tests; never label its fixed sequence as autonomous reasoning.

**Acceptance:** record the target, model configuration without secrets, limits, actual actions/outcomes, termination reasons, and attributable artifacts. Show that decisions respond to observations and goals rather than hardcoded call counts. Assess behavioral differences and false positives without promising every run will find a defect. A passing benchmark or nonzero observation count alone is insufficient.

## Later work and task selection

Multi-round debate, additional profiles/tools, video/diff/annotation UI, managed application startup, broader authentication, npm publication, and durable handler recovery are separate proposals. They must not displace the first trustworthy exploration path. Distinct 3D human character avatars represent each profile (Alex, Leo, Chloe, David, Elena, Marcus); distinct artwork is presentation metadata, not proof of autonomous behavior.

Start with **C1 only** when implementation is requested. For each subsequent slice, inspect the current source, identify dependencies, propose concrete validation, and obtain scope authorization. Update the observed gap only after evidence supports the new guarantee. See [ROADMAP.md](ROADMAP.md) and [TESTING.md](TESTING.md).
