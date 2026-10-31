---
name: offscript-boundary-review
description: Reviews OFFSCRIPT lifecycle, evidence, finding, and browser-tool changes for cross-layer invariant failures. Use when effects cross domain, storage, runtime, or transport boundaries; skip cosmetic and copy-only work.
---

# Review cross-layer guarantees

Follow [AGENTS.md](../../../AGENTS.md) and [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Read only the focused persistence, Mozaik, browser or outbox documents needed by this change. [CONSOLIDATION.md](../../../docs/CONSOLIDATION.md) records prior counterexamples, not a replacement for source inspection.

## Identify the owner and observable guarantee

State the invariant in one sentence and identify who owns it: domain transition, application decision, database transaction, runtime resource, tool authorization, or presentation. Follow the result/error from the owning layer to the API and UI. An atomic database write does not establish correct handling of a conflict, and a terminal badge does not prove successful persistence or resource closure.

For each affected boundary, consider the actual failure window rather than applying every item below to every task:

- **Lifecycle:** start reservation, duplicate start, start/stop/timeout races, CAS rejection, partial initialization, close failure, shutdown and restart. Distinguish session settlement, participation outcome and goal achievement. Never infer provider abortion from Mozaik leave or idle.
- **Evidence/finding:** capture succeeds but storage fails, an ID exists but the artifact does not, retention removes referenced content, IDs collide, provenance is supplied by the model, or a roster is mistaken for independent corroboration. Keep a pure classifier independent of I/O and distinguish reference membership from artifact/semantic verification.
- **Browser resources:** concurrent initial launch, failed context creation, close during initialization, stale or page-controlled references, request scope versus action permission, and sensitive content crossing snapshots/screenshots/logs/cache.
- **Delivery:** committed versus published versus handled events, duplicate delivery, ordering, and late effects after admission closes. Preserve the existing outbox/Mozaik ownership rather than adding a parallel bus or inference loop.

Check actor/simulation identity binding and authenticated access at the relevant external boundary. Restricting origins does not authorize destructive business actions. Context isolation does not isolate accounts or backend records.

## Propose the smallest correction

Preserve inward dependencies and controlled public entries. Identify where a required guarantee cannot be represented by current data; return an honest provisional/unknown outcome instead of manufacturing proof. Do not introduce a new service, policy framework, database table or verification protocol unless the approved change needs it.

Choose validation that reaches the owning boundary: real SQLite for rollback/CAS, installed Mozaik for its integration, and browser checks only within authorized scope. Reuse existing coverage; do not add a case for each extracted function. Report any unexercised risk instead of claiming a mock establishes the real adapter guarantee.

Return a concise decision record: guarantee, owner, failure behavior, chosen change, rejected alternative when material, and verification/remaining limits. No private reasoning transcript or exhaustive checklist artifact is needed. Record out-of-scope findings and continue the approved task; do not silently fix them or repeatedly ask for permission already supplied.
