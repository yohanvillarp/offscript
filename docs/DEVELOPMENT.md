# Development commands

## Requirements and conventions

Use Node.js 24, npm, Git, and GNU Make 4 or newer. Run Make from the repository root. On macOS, the preinstalled Make may be older; use a suitable GNU Make executable, sometimes named `gmake`. On Windows, GNU Make must be on PATH alongside Node/npm and Git. The recipes use these executables directly and do not require Bash, awk, grep, or Unix file commands. Make is optional: existing npm commands remain supported and are the source of application task definitions.

`make` and `make help` list all targets with descriptions. Recipes require literal tabs and LF line endings; do not replace their indentation with spaces. `NODE` and `NPM` default to `node` and `npm` and can be overridden for a local toolchain. Targets are serialized even with `-j` to avoid overlapping installs, checks, or TypeScript build metadata writes. Run long-lived development servers in separate terminals.

## Setup

```sh
make setup
```

This installs root and Studio dependencies from their lockfiles, activates Husky through npm's prepare hook, and sets this clone's commit template to `.gitmessage`. Root and Studio remain independent npm installations without workspaces.

Use `make install`, `make install-root`, or `make install-studio` when only dependency installation is needed. `make hooks` activates Husky again; `make git-template` configures only the local template. These targets do not modify global Git configuration or publish changes.

## Development

```sh
make dev-server
```

Starts the protected local host. See [LOCAL-HOST.md](LOCAL-HOST.md) for authentication and resource ownership. The port defaults to an available port; the project root defaults to the working directory. Pass host configuration through shell environment variables or Make command-line variables, which GNU Make exports to recipes:

```sh
make dev-server OFFSCRIPT_PORT=4317
make dev-server "OFFSCRIPT_PROJECT_ROOT=C:/Projects/My App"
```

`OFFSCRIPT_DATA_DIRECTORY` is also supported. Relative storage paths resolve against the project root. The server script does not automatically load `.env`. Tokens are stored in an ignored local access file, not printed.

In another terminal:

```sh
make dev-studio
```

This starts standalone Vite for UI development. For the authenticated connected experience use `make build-local` then `make start-local` with `OFFSCRIPT_PROJECT_ROOT`, or the root launcher described in [LOCAL-TRIAL.md](LOCAL-TRIAL.md). Separate Vite does not receive host cookies or credentials. Stop each process with Ctrl+C. `make preview-studio` serves an existing production build after `make build`.

## Validation

| Target | Scope |
| --- | --- |
| `make check` | Canonical `npm run check`: all module typechecks/tests, migration metadata, lint, and Studio build. Matches CI and pre-push. |
| `make typecheck` | All internal module typechecks, Studio production TypeScript, and Studio test typechecking. |
| `make test` | All existing unit/integration suites, including Studio. |
| `make lint` | Internal packages/scripts and Studio. |
| `make build` | Studio TypeScript project build and Vite production build. |
| `make commitlint` | A Conventional Commit message supplied through stdin. |

For focused checks, use `make test-<module>` or `make typecheck-<module>`. Supported modules are `domain`, `contracts`, `application`, `orchestration`, `persistence`, `runtime`, `server`, and `projects`. Studio has `test-studio`, `typecheck-studio`, and `lint-studio`; internal lint is available as `lint-packages`.

`typecheck-studio` invokes the installed compiler against the same project references used by Studio's build, then checks draft tests. It does not run Vite. Use `make check` before publication rather than assuming a focused check covers the entire repository.

## Database migrations

```sh
make db-check
make db-generate MIGRATION_NAME=add_example
```

`db-check` verifies Drizzle migration metadata; it does not migrate a database. `db-generate` creates SQL and snapshot artifacts, so review the diff. Its name must start with a lowercase letter and contain only lowercase letters, digits, underscores, or hyphens. Invalid/missing names fail before generation.

Applied migrations are immutable. Startup applies reviewed migrations through the persistence module; there is no Make target for schema push, database reset, or direct Drizzle migration execution. See [PERSISTENCE.md](PERSISTENCE.md).

## Demos and audits

`make demo-mozaik` runs the deterministic inference fixture on the actual Mozaik runtime without model API calls. `make demo-mozaik-live` explicitly enables live provider inference against the simulated cart; configure the supported model and credentials as described in [MOZAIK-INTEGRATION.md](MOZAIK-INTEGRATION.md). Live inference can use the network and incur provider charges; it is not part of setup or checks.

`make audit` audits root and Studio dependencies; `audit-root` and `audit-studio` run separately. Audits require registry access and may fail when advisories are reported. They never run automatic fixes and do not silently extend the canonical check pipeline.

## Inspecting commands

Use `make -n <target>` to inspect recipes without executing them, for example `make -n setup` or `make -n db-generate MIGRATION_NAME=add_example`. No target commits, pushes, merges, deploys, cleans the repository, or deletes project data. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for the publication workflow.
