# Contributing to OFFSCRIPT

## Workflow

`main` represents production: every change must arrive through a GitHub pull request from a work branch. Do not commit or push directly to `main`. Keep each PR focused and production-ready; urgent fixes also require review.

Before working, read [AGENTS.md](AGENTS.md), [PROJECT.md](docs/PROJECT.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), and the files relevant to your task.

## Setup

Use Node.js 24 and npm. From the repository root:

An optional GNU Make entry point groups existing tasks: `make help` lists commands and `make setup` performs the setup below. See [Development commands](docs/DEVELOPMENT.md) for requirements, platform notes, and all targets. npm remains the underlying task runner.

```sh
npm ci
npm ci --prefix apps/studio
git config --local commit.template .gitmessage
```

The first installation runs `prepare` and activates Husky for this clone. The second installs Studio independently. This project does not use workspaces. The commit template configuration is local: each contributor must run that command once. Use `git commit` without `-m` to open the template.

## Line endings

`.gitattributes` sets LF for text files on Windows, macOS, and Linux, including hooks and shell scripts. Windows `.bat` and `.cmd` scripts use CRLF in the working tree; binary files are not converted. These rules take precedence over `core.autocrlf` without requiring changes to global Git configuration.

Configure your editor to save text with LF. Inspect normalization with `git ls-files --eol` and `git diff --check`. Git stores normalized text with LF in the index, including Windows scripts.

## Branches and pull requests

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/short-description
# Implement and validate one focused change.
npm run check
git add <files>
git commit
git push -u origin feat/short-description
```

Open a PR targeting `main`. Use short branch names with prefixes such as `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, or `hotfix/`. Describe the problem, resulting behavior, validation performed, and risks. Resolve review comments before merging. Do not force-push shared branches.

After the required checks and review pass, merge the PR using the method appropriate for its history:

- **Merge commit:** preserve the individual commits and the PR boundary. Use this for a coherent series of commits.
- **Squash merge:** combine work-in-progress commits into one focused commit when useful.
- **Rebase merge:** replay clean commits onto the base branch when a linear result is preferred.

No single merge method is mandatory. Keep PR titles and authored commits consistent with Conventional Commits; GitHub-generated merge commits may use GitHub's default message. Review the final message when squashing. See [GitHub's merge methods](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github).

GitHub deletes the remote work branch automatically after merging. Update local `main` with `git pull --ff-only`, then remove the merged local branch and prune stale remote references. Use `git branch -d <branch>`; if squash or rebase prevents Git from recognizing the merge, verify the PR and commit history before removing the local branch. Never delete a branch while its PR is open. Every merge to `main` must be production-ready; this repository does not yet configure automatic deployments.

## Commits

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), using [commitlint](https://commitlint.js.org/) and its conventional configuration:

```text
feat(studio): add session filtering
fix(cli): handle interrupted sessions
docs: clarify contribution workflow
```

Format: `type(optional-scope): description`. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`. Use a concrete, imperative description without a trailing period and a header of at most 100 characters. The scope is optional and should identify the affected area. Avoid WIP commits in the final history.

Separate the body and footer with blank lines. Mark breaking changes with `!` and explain the migration in a `BREAKING CHANGE:` footer. Reference issues when applicable. `.gitmessage` provides these instructions when drafting a commit.

## Validation and hooks

| Stage | Rule |
| --- | --- |
| `pre-commit` | Rejects commits on `main` and runs internal package and Studio lint. |
| `commit-msg` | Validates the message with commitlint. |
| `pre-push` | Rejects any `refs/heads/main` destination and runs `npm run check`. |
| GitHub Actions | Validates the PR title and runs `npm run check` for PRs targeting `main`; also validates pushes to `main`. |

Run `npm run check` from the root to execute domain/contracts typechecks and unit tests, internal package and Studio lint, and the Studio build. The Studio build includes TypeScript checking. Run module checks independently with `npm run typecheck:domain`, `npm run typecheck:contracts`, `npm run test:domain`, or `npm run test:contracts`. `npm run typecheck:application` and `npm run test:application` validate the application use case. `npm test` runs domain, contracts, application, orchestration, persistence, runtime, and Studio tests. Persistence commands are `npm run typecheck:persistence`, `npm run test:persistence`, and `npm run db:check`. Review generated SQL from `npm run db:generate` and keep applied migrations immutable; see docs/PERSISTENCE.md. Mozaik checks are `npm run typecheck:orchestration` and `npm run test:orchestration`; Node scheduler checks are `npm run typecheck:runtime` and `npm run test:runtime`; `npm run demo:mozaik` runs the real runtime with deterministic inference. See docs/MOZAIK-INTEGRATION.md for optional live inference and its environment configuration. Root `npm run check` includes all module typechecks and tests. Server checks are `npm run typecheck:server` and `npm run test:server`; `npm run dev:server` starts the development host. See docs/LOCAL-HOST.md for local authentication and configuration. There is no end-to-end browser test suite yet. Add meaningful tests when implementing functionality and report what you actually ran.

[Husky](https://typicode.github.io/husky/) hooks are local controls and can be bypassed; they do not replace GitHub protection. Do not bypass them to integrate failing changes. Lint inspects the working tree, not only staged files: keep commits coherent.

## Quality and security

- Write clean, modular code. Follow the 250-line limit and script exceptions in AGENTS.md.
- Preserve architectural boundaries and use semantic tokens in Studio.
- Implement only the requested scope; update documentation when approved decisions change.
- Write and maintain all project documentation in English.
- Do not include secrets, credentials, or sensitive evidence. `.env.example` must contain only dummy values.
- Do not execute destructive actions against external software without explicit authorization.

## Protecting main on GitHub

An administrator must configure a ruleset targeting `main` and the repository settings:

1. Require pull requests and at least one approval from another person; dismiss stale approvals when code changes and require conversation resolution.
2. Require the `quality` check and an up-to-date branch before merging.
3. Block force pushes and deletion of `main`; apply the rules to administrators and avoid routine bypasses.
4. Allow merge commits, squash merge, and rebase merge. Do not require linear history, since that would prohibit merge commits.
5. Enable automatic head-branch deletion after merging. Use the PR title as the default squash commit title when squash is chosen.

These remote rules are documented here; creating local files does not activate them. The check will appear after GitHub runs the workflow. If an option depends on the plan or permissions, the administrator must confirm its availability. This contribution does not configure a deployment workflow or production credentials.
