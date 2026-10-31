# Antigravity project context

Verified against the [official rules documentation](https://antigravity.google/docs/rules/) on 2026-10-30.

Antigravity discovers `AGENTS.md`, `GEMINI.md`, and `.agents/rules/*.md` in project directory scopes. Root instruction files are always active without frontmatter. Modular rules require valid YAML `trigger` metadata. `.agents` is the current location; `.agent/rules` remains supported for compatibility. Neither directory is mandatory when root instructions suffice.

## Repository setup

| File | Responsibility |
| --- | --- |
| `AGENTS.md` | Shared development constraints and validation commands. |
| `GEMINI.md` | Short context entry point linking existing project documentation. |
| `.agents/rules/planning.md` | On-demand roadmap guidance using `trigger: model_decision`. |
| `docs/CONSOLIDATION.md` | Source-audited gaps, validation limits and scoped acceptance criteria. |
| `docs/ANTIGRAVITY-HANDOFF.md` | Copyable restart assignment for C1; not authority to implement the entire backlog. |

Keep project facts in their existing documents rather than copying them into tool-specific rules. Open the repository root as the workspace. Repository skills below are instruction-only files; no global settings, permissions, runtime integrations, or external tools are installed.

## Repository skills

The [official skills documentation](https://antigravity.google/docs/skills?app=antigravity-ide), checked on 2026-10-31, documents `.agents/skills/<name>/SKILL.md` as the project location, with YAML frontmatter describing skill selection. These skills use only the portable name/description format and Markdown instructions; they require no Codex-specific tooling.

| Skill | Use it for | Do not use it to |
| --- | --- | --- |
| [offscript-capability-audit](../.agents/skills/offscript-capability-audit/SKILL.md) | Auditing a capability claim, roadmap status, or onboarding report against defaults and actual evidence. | Run live exploration or fix an entire backlog during a review. |
| [offscript-boundary-review](../.agents/skills/offscript-boundary-review/SKILL.md) | Reviewing lifecycle/storage/tool/evidence guarantees and their failure windows. | Introduce general frameworks or require a full audit for cosmetic edits. |
| [offscript-scoped-delivery](../.agents/skills/offscript-scoped-delivery/SKILL.md) | Implementing an approved feature/fix with appropriate regression evidence and an honest completion report. | Start subsequent milestones or publish without authorization. |

Mention the skill name and requested outcome explicitly if automatic selection misses it. For example: “Use offscript-capability-audit to assess whether milestone 4 is product-validated; do not change code.” For C1, use scoped delivery and review only the relevant confirmation/evidence boundary.

Skills produce concise decision/evidence summaries, not private reasoning transcripts or extra permanent reports for every edit. Product facts remain in PROJECT/ARCHITECTURE/CONSOLIDATION and test policy in TESTING. Skills do not make runtime correctness checks pass or guarantee an agent will follow them.

Validation covers frontmatter, names and relative links. Discovery/activation inside an installed Antigravity session still needs confirmation by the user; no browser or global configuration was used to test it.

The files were checked for paths and documented metadata; activation in an installed Antigravity session has not been tested. These instructions support development of OFFSCRIPT and do not configure its artificial users or Mozaik runtime.
