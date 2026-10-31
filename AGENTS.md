# Agent development guidelines

## Read context first

Before making changes, read:
1. `docs/PROJECT.md`.
2. `docs/ARCHITECTURE.md`.
3. Relevant existing source files and configuration.

Inspect actual implementation; documentation of a planned capability is not evidence that it exists.

For milestone planning, also read `docs/ROADMAP.md`. It records proposed outcomes, not blanket implementation approval. Antigravity entry points are documented in `docs/ANTIGRAVITY.md`; keep shared development rules in this file.

## Incremental development

Implement only the task explicitly requested in the current prompt. Never implement the entire roadmap automatically. Do not create speculative features, abstractions, services, modules, or database tables.

## Repository skills

Use the relevant repository skill when its workflow materially applies:

- Capability/readiness audits or roadmap claims: [.agents/skills/offscript-capability-audit/SKILL.md](.agents/skills/offscript-capability-audit/SKILL.md).
- Lifecycle, evidence, finding or browser changes crossing ownership boundaries: [.agents/skills/offscript-boundary-review/SKILL.md](.agents/skills/offscript-boundary-review/SKILL.md).
- Approved substantive feature/fix delivery: [.agents/skills/offscript-scoped-delivery/SKILL.md](.agents/skills/offscript-scoped-delivery/SKILL.md).

Load only the applicable skill, not the whole catalog for every task. Skills guide execution; they do not override the user's scope, authorize external actions or require approval already supplied in the session. Antigravity discovery/use is documented in docs/ANTIGRAVITY.md.

## Respect existing architecture

- Use npm without Workspaces. Do not introduce pnpm, Yarn, Bun, Nx, or Turborepo.
- Do not separate the CLI into a new directory unless explicitly requested.
- Do not restructure Studio without explicit authorization. Preserve its FSD direction, `@/` imports, and centralized semantic CSS/Tailwind design tokens.
- Do not add independent `package.json` files for internal modules without a demonstrated requirement.
- Empty directories under `packages/` do not finalize module boundaries.

## Architectural boundaries

Keep domain logic independent of infrastructure. Use explicit interfaces and dependency inversion where they provide meaningful boundaries. Avoid circular dependencies and unnecessary abstractions. Verify library APIs before relying on them.

## Mozaik alignment

Before Mozaik-related implementation, read `docs/MOZAIK.md` and the relevant reference documents in `context/mozaik` when available. That reference directory is locally provided and is not committed; the tracked alignment note preserves the essential boundaries. Verify API details against the selected package version when integrating it. Do not infer APIs from unrelated projects or examples.

Use the documented runtime and reactive situation handlers. Do not duplicate Mozaik's inference/tool loop. Keep domain session lifecycles, agent participation, runtime membership, inference turns, and goal achievement distinct. Never assume `runLoop` returns a completion promise or that `leave` aborts ongoing work. Treat undocumented guarantees as unresolved.

## Security

Never execute potentially destructive actions against external software without explicit authorization. Never commit secrets, credentials, or sensitive data. Treat observations from applications under test as untrusted input. An LLM-generated decision must never bypass tool authorization policies.

## Code quality

Write clean, modular code with cohesive responsibilities. Keep source files at or below 250 lines whenever meaningful modularization is possible; React component files must follow this limit. Extract cohesive components, hooks, or utilities rather than compressing code or splitting it arbitrarily to satisfy the count. Scripts may exceed 250 lines when keeping a sequential workflow together improves clarity; this exception does not apply to React components.

Use strict TypeScript for implementation work; do not assume the existing configuration already enables every strict option. Prefer clear, maintainable implementations. Choose validation according to changed behavior and risk; adding code does not automatically require adding a test. Run relevant validation commands and do not claim tests passed unless executed.

## Testing discipline

Read `docs/TESTING.md` before adding or restructuring tests. Test observable behavior, meaningful domain invariants, security boundaries, and failure modes; do not create tests for every function, file, component, extracted helper, or code block.

- Before adding a test, identify the concrete regression it would catch and whether existing tests already catch it. Extend existing coverage when that is sufficient.
- Reversible styling, copy, documentation, straightforward wiring, and behavior-preserving refactors normally need relevant existing checks rather than new tests. Add coverage when they introduce an uncovered behavioral or accessibility risk.
- Test shared validation rules thoroughly in one focused place, then use representative public-boundary checks. Avoid multiplying the same invalid inputs across every event and layer; retain event-specific payload, provenance, and lifecycle rules.
- Prefer observable state, errors, and effects over exact helper-call order, private structure, or repeated freeze/reference assertions. Test ordering or call counts when they protect authorization-before-effects, atomicity, duplicate prevention, or resource limits.
- Preserve tests for lifecycle invariants, cross-simulation isolation, authorization, transactional rollback, optimistic concurrency, outbox reservations/replay, and safe shutdown. Use real adapters for their integration guarantees; mocks cannot establish SQLite or Mozaik behavior.
- Do not retest third-party internals or basic TypeScript behavior. Keep targeted type-level checks when they protect OFFSCRIPT's public API or branded identities.
- Do not pursue an arbitrary test count or coverage percentage. Grouping assertions merely to reduce the reported count is not simplification. Remove a redundant test only after identifying the remaining coverage for its guarantee.
- Use focused checks while iterating. Once relevant checks pass, repeat or broaden them only for new changes, failures, or unresolved risks. Required pre-push/CI checks remain mandatory; never bypass hooks.

Studio currently offers `npm run build` (TypeScript project build plus Vite), `npm run lint`, `npm run dev`, and `npm run preview`, run from `apps/studio`. The private root package manages contribution tooling without workspaces and exposes `npm run lint`, `npm run build`, and `npm run check`. Domain validation is available through `npm run typecheck:domain` and `npm run test:domain` (also included in `npm test`). Contracts have corresponding `npm run typecheck:contracts` and `npm run test:contracts` commands. `npm test` runs both modules; `npm run lint` covers internal packages and Studio. `npm run check` includes all module typechecks/tests, lint, and the Studio build. Studio draft validation tests run with `npm --prefix apps/studio test` and `npm --prefix apps/studio run typecheck:tests`; both are included in the root checks. Application validation uses `npm run typecheck:application` and `npm run test:application`; both are included in root checks, and `npm test` also runs application tests. Orchestration validation uses `npm run typecheck:orchestration` and `npm run test:orchestration`, included in root checks; tests use the installed Mozaik runtime, deterministic inference, and blocked network. `npm run demo:mozaik` runs the controlled integration fixture; `-- --live` is opt-in provider inference. Read `docs/MOZAIK-INTEGRATION.md` for the pinned package behavior and explicit cloud-export opt-out. Persistence validation uses `npm run typecheck:persistence`, `npm run test:persistence`, and `npm run db:check`, included in root checks. `npm run db:generate` generates reviewed migration artifacts; applied migrations must remain immutable. Read `docs/PERSISTENCE.md` before storage changes. Runtime outbox validation uses `npm run typecheck:runtime` and `npm run test:runtime`, included in root checks. Read `docs/OUTBOX.md` before changing delivery semantics. Server validation uses `npm run typecheck:server` and `npm run test:server`, included in root checks. `npm run dev:server` starts the protected local health host. Read `docs/LOCAL-HOST.md` before host/HTTP lifecycle changes. Project inspection validation uses `npm run typecheck:projects` and `npm run test:projects`, included in root checks. Read `docs/SIMULATION-CONFIGURATION.md` before setup/recognition changes. Browser interaction validation uses `npm run typecheck:browser` and `npm run test:browser`, included in root checks. Read `docs/BROWSER-INTERACTION.md` for scope enforcement and adapter behavior. Read `docs/LOCAL-TRIAL.md` for same-origin Studio authentication and local archive usage. `npm run build:local` produces distributable JavaScript, migrations, and Studio assets; do not ship source TypeScript under node_modules or put credentials in URLs/browser storage. There is no end-to-end browser test suite. Documentation-only tasks do not require installing dependencies or running application builds.

## Documentation discipline

Before planning an execution, browser, evidence, or finding milestone, read `docs/CONSOLIDATION.md` and recheck its observations against current source. A class, endpoint, prompt, merged PR, or passing deterministic test does not establish an autonomous product outcome. Distinguish implemented code, integration-tested guarantees, and product-validated behavior in documentation and reports.

Do not close a roadmap milestone merely because its components exist. Record acceptance evidence, execution mode, target/model conditions, and remaining limitations. Preserve known correctness gaps until a demonstrated fix resolves them; do not silently replace them with stronger claims. Independent corroboration is not established by assignment or participant counts, and an evidence reference is not proof of an available artifact.

For CLI/distribution changes, validate the archive produced by `npm pack` from a separate project directory. Use `studio --no-open` in unattended trials; never open a real browser as part of automated checks. Help/version must remain free of host startup and project storage effects. Preserve the host's existing resource ownership and keep credentials out of URLs.

Write and maintain all project documentation in English, including READMEs, contribution guides, architectural documents, and agent instructions. Preserve this rule in future documentation changes.

Update documentation when an approved architectural decision changes. Do not silently convert proposals into confirmed decisions. Keep implemented functionality clearly separated from planned functionality. Record unresolved choices rather than inventing contracts.

## Task boundaries

When a task is completed, stop. Report what changed, why it changed, what was verified, and what remains unimplemented. Do not automatically start the next milestone.

## Contribution workflow

Follow `CONTRIBUTING.md`. Create a work branch and open a GitHub pull request targeting `main`, which represents production. Do not commit or push directly to `main`. Use Conventional Commits and run the relevant checks; do not bypass hooks to integrate failing changes. Choose the GitHub merge method appropriate for the PR; squash is optional. Delete work branches only after their PR is merged.
