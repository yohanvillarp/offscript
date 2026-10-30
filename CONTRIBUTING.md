# Contributing to OFFSCRIPT

## Workflow

`main` represents production: every change must arrive through a GitHub pull request from a work branch. Do not commit or push directly to `main`. Keep each PR focused and production-ready; urgent fixes also require review.

Before working, read [AGENTS.md](AGENTS.md), [PROJECT.md](docs/PROJECT.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), and the files relevant to your task.

## Setup

Use Node.js 24 and npm. From the repository root:

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

Use squash merge to integrate each PR as one coherent commit; its title must follow Conventional Commits. Delete the branch after merging. Every merge to `main` must be production-ready; this repository does not yet configure automatic deployments.

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
| `pre-commit` | Rejects commits on `main` and runs Studio lint. |
| `commit-msg` | Validates the message with commitlint. |
| `pre-push` | Rejects any `refs/heads/main` destination and runs lint and build. |
| GitHub Actions | Validates the title, lint, and build for PRs targeting `main`; also validates pushes to `main`. |

Run `npm run check` from the root to execute lint and build; the Studio build includes TypeScript checking. There is no automated functional test suite yet. Add meaningful tests when implementing functionality and report what you actually ran.

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
4. Require linear history, enable squash merge, and disable merge commits and rebase merge to preserve this workflow.
5. Set the PR title as the default squash commit title and review the final message before merging.

These remote rules are documented here; creating local files does not activate them. The check will appear after GitHub runs the workflow. If an option depends on the plan or permissions, the administrator must confirm its availability. This contribution does not configure a deployment workflow or production credentials.
