# OFFSCRIPT context

Follow [AGENTS.md](AGENTS.md) for shared development instructions. Keep those instructions authoritative within this repository rather than maintaining a separate copy here.

Before planning or changing code, read:

1. [Project](docs/PROJECT.md): product intent and implemented versus planned behavior.
2. [Architecture](docs/ARCHITECTURE.md): confirmed boundaries and unresolved decisions.
3. [Roadmap](docs/ROADMAP.md): proposed outcomes; implement only the current requested slice.
4. Relevant source, configuration, and focused documentation linked from those files.

For Mozaik, read `docs/MOZAIK.md` and the locally available `context/mozaik` references. For persistence/delivery, read `docs/PERSISTENCE.md` and `docs/OUTBOX.md`. Inspect installed APIs instead of inventing guarantees.

Write project documentation in English. Report actual validation and deferred work. Antigravity setup notes are in [docs/ANTIGRAVITY.md](docs/ANTIGRAVITY.md).

Before adding tests, read [docs/TESTING.md](docs/TESTING.md). Choose coverage for uncovered behavior and material risk; do not generate tests for each code block or duplicate checks already owned by another suite.
