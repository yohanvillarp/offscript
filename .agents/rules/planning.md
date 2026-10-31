---
trigger: model_decision
description: "Use when planning OFFSCRIPT milestones, choosing the next implementation slice, or updating roadmap status."
---

# Incremental roadmap planning

Read `AGENTS.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, and `docs/ROADMAP.md` from the repository root.

Check relevant source and Git state before describing a capability as implemented or merged. A roadmap entry is a proposed outcome, not permission to execute it.

Plan one coherent, reviewable slice with observable completion criteria. Preserve unresolved decisions until the task requires and authorizes resolving them. Do not invent internal modules, public contracts, or tables to fill future milestones.

Use `docs/TESTING.md` when selecting validation. Identify uncovered behavioral risks before proposing new tests; do not budget a test for every file, helper, or component. Reuse relevant existing checks and preserve required publication checks.

After completing the requested slice, update only the affected documentation and stop. Follow the contribution workflow when publication is requested.
