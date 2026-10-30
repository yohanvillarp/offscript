# Antigravity project context

Verified against the [official rules documentation](https://antigravity.google/docs/rules/) on 2026-10-30.

Antigravity discovers `AGENTS.md`, `GEMINI.md`, and `.agents/rules/*.md` in project directory scopes. Root instruction files are always active without frontmatter. Modular rules require valid YAML `trigger` metadata. `.agents` is the current location; `.agent/rules` remains supported for compatibility. Neither directory is mandatory when root instructions suffice.

## Repository setup

| File | Responsibility |
| --- | --- |
| `AGENTS.md` | Shared development constraints and validation commands. |
| `GEMINI.md` | Short context entry point linking existing project documentation. |
| `.agents/rules/planning.md` | On-demand roadmap guidance using `trigger: model_decision`. |

Keep project facts in their existing documents rather than copying them into tool-specific rules. Open the repository root as the workspace. No global settings, skills, workflows, permissions, or runtime integrations are installed by these files.

The files were checked for paths and documented metadata; activation in an installed Antigravity session has not been tested. These instructions support development of OFFSCRIPT and do not configure its artificial users or Mozaik runtime.
