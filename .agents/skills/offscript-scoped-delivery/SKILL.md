---
name: offscript-scoped-delivery
description: Delivers an approved OFFSCRIPT feature or correctness fix as a bounded change with a reproducer, appropriate validation, and truthful completion evidence. Use for substantive implementation slices, not read-only audits or simple copy edits.
---

# Deliver one approved slice

Read [AGENTS.md](../../../AGENTS.md), the relevant source and [TESTING.md](../../../docs/TESTING.md). Use [CONSOLIDATION.md](../../../docs/CONSOLIDATION.md) when the task names a consolidation item. Those documents contain project policy and facts; do not duplicate them in a new plan or permanent memory file.

## Establish the working boundary

Inspect Git state and preserve existing work. Summarize the requested behavior, the acceptance condition and any nearby work explicitly deferred. Existing authorization covers routine implementation choices inside that boundary. Ask only for genuinely blocking missing information; do not manufacture an approval stage or run the roadmap automatically.

For a defect, establish expected versus observed behavior using the smallest permitted reproducer. For a new capability, identify the observable outcome and how the user reaches it. Inspect existing tests before adding coverage; a passing test can encode an incorrect rule and may need an intentional compatibility update.

## Implement and verify proportionally

Trace the changed behavior through the real public path and choose the meaningful seam to edit. A change in persistence must propagate failure honestly; a change to confirmation must propagate uncertainty to its consumers. Inspect an adjacent layer when necessary to establish this behavior, without automatically redesigning it.

Use the boundary-review skill only when cross-layer effects warrant it. Select focused validation for the material regression rather than testing every block. Run relevant checks, then mandatory hook/CI checks when publication is requested. Respect the current browser/provider authorization; explicitly report an unexecuted wider suite if it would exceed that scope. Never bypass hooks to claim publication readiness.

If an attempted fix reveals a new dependency, explain its concrete necessity and choose the smallest solution within scope. If it requires a genuinely new product decision, identify that decision rather than inventing the answer or starting another milestone. Do not install infrastructure just because a future step might need it.

## Close with evidence

Review the diff for unintended changes, secrets, stale references and contradictory documentation. Update the relevant acceptance status only to the level established by evidence. For deterministic tests, state the controlled runner/target and what remains unproved; documentation changes alone do not resolve code defects.

Report changed behavior/files, actual commands/results, the regression before/after when applicable, compatibility impacts and remaining limits. Use a compact claim-to-evidence table only when it improves clarity. Do not use test totals as a quality score or describe absent model/browser validation as completed.

Stop when the approved outcome is complete. Recommend the next slice without implementing it. Commits, pushes and publication follow the user's current authorization and repository workflow; the skill grants none of those permissions by itself.
