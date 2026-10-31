---
name: offscript-capability-audit
description: Audits OFFSCRIPT capability claims, roadmap status, and onboarding reports against reachable code and actual validation. Use for readiness reviews or documentation alignment, not routine styling changes.
---

# Audit capability claims

Follow [AGENTS.md](../../../AGENTS.md). Read the relevant product/architecture documents and [CONSOLIDATION.md](../../../docs/CONSOLIDATION.md); treat its dated observations as hypotheses to recheck, not timeless truth.

## Trace the actual product path

For the claim under review, trace the normal CLI/Studio entry through composition, defaults, application behavior, adapters and observable result. Inspect the selected runner/provider, not only an injectable interface or a factory name. Check whether the same path is reachable in the installed distribution when that is part of the claim.

Distinguish a fixed fixture, real browser interaction with scripted decisions, and model-driven goal pursuit. Profile instructions alone do not demonstrate behavioral differentiation. Read benchmark assertions: constructed conclusions and counts of observations do not prove discovery or accuracy.

Use a compact claim ledger only for material claims:

| Claim | Reachable code/default | Executed evidence | Counterexample or limit | Status |
| --- | --- | --- | --- | --- |

Classify each as implemented, integration-tested, product-validated, partial, or not established according to [ROADMAP.md](../../../docs/ROADMAP.md). Evidence from an earlier session is historical evidence; label it rather than claiming a fresh execution. Do not run browsers, live providers or other external actions merely to complete the ledger.

## Challenge the guarantee

Choose a small counterexample proportional to the claim: missing evidence, an empty input list, a failed persistence write, a stale runtime handle, or an unavailable artifact. Prefer an existing test/helper or a permitted in-memory reproduction. A test that codifies the questionable rule is not an independent oracle.

Separate demonstrated defects, source-supported risks, and unresolved questions. State expected versus observed behavior and cite current files/locations. Never invent a passing reproduction for a source-only finding.

## Reconcile and report

When documentation editing is requested, correct both the milestone summary and adjacent documents that contradict it. Keep product intent separate from current behavior, and record a newly unresolved acceptance criterion without deleting the delivered work. Update the dated consolidation record when evidence changes; avoid copying its backlog into every document.

Report the few highest-impact findings, their evidence, the next scoped recommendation and validation limits. Auditing does not authorize fixes or the rest of the roadmap. For an implementation task, continue only within the user's existing authorization rather than requesting approval again for already-approved work.
