# OFFSCRIPT developer tasks. Run from the repository root with GNU Make 4+.
# npm scripts own application tasks; this file adds aliases, grouping, and help.
# Recipes use Node/npm/git directly: no POSIX-only shell utilities are required.
# Recipe indentation must remain literal tabs; keep this file LF-normalized.

.DEFAULT_GOAL := help
.NOTPARALLEL:
.DELETE_ON_ERROR:

NODE ?= node
NPM ?= npm
# Required only by db-generate. Export without interpolating into its validator.
export MIGRATION_NAME

.PHONY: help setup install install-root install-studio hooks git-template \
        dev-server dev-studio preview-studio check build lint lint-packages \
        lint-studio test typecheck typecheck-studio test-studio commitlint typecheck-domain \
        test-domain typecheck-contracts test-contracts typecheck-application test-application typecheck-orchestration test-orchestration \
        typecheck-persistence test-persistence typecheck-runtime test-runtime typecheck-server test-server db-check \
        db-generate demo-mozaik demo-mozaik-live audit audit-root audit-studio

##@ Help and setup
help: ## Show available targets and their purpose.
	@$(NODE) -e "const fs = require('node:fs'); for (const line of fs.readFileSync('Makefile', 'utf8').split('\n')) { if (line.startsWith('##@ ')) console.log('\n' + line.slice(4)); const match = line.match(/^([a-z][a-z0-9-]*):.*?## (.+)/); if (match) console.log('  ' + match[1].padEnd(26) + match[2]); }"

setup: install git-template ## Install locked dependencies and configure the local commit template.

install: install-root install-studio ## Install root and Studio dependencies from their lockfiles.

install-root: ## Run npm ci at the root; prepare activates Husky.
	$(NPM) ci

install-studio: ## Run npm ci for the independent Studio application.
	$(NPM) --prefix apps/studio ci

hooks: ## Activate the repository Husky hooks.
	$(NPM) run prepare

git-template: ## Configure .gitmessage for this clone only.
	git config --local commit.template .gitmessage

##@ Development (long-running; use separate terminals)
dev-server: ## Start the protected local health host; no agents start automatically.
	$(NPM) run dev:server

dev-studio: ## Start the Vite Studio development server.
	$(NPM) --prefix apps/studio run dev

preview-studio: ## Preview an existing Studio production build.
	$(NPM) --prefix apps/studio run preview

##@ Repository validation
check: ## Run the canonical complete npm check used by CI and pre-push.
	$(NPM) run check

build: ## Typecheck and build Studio for production.
	$(NPM) run build

lint: ## Lint internal packages/scripts and Studio.
	$(NPM) run lint

lint-packages: ## Lint internal packages, scripts, and Drizzle configuration.
	$(NPM) run lint:packages

lint-studio: ## Lint Studio.
	$(NPM) --prefix apps/studio run lint

test: ## Run all module and Studio unit/integration tests.
	$(NPM) test

typecheck: typecheck-domain typecheck-contracts typecheck-application typecheck-orchestration typecheck-persistence typecheck-runtime typecheck-server typecheck-studio ## Typecheck all internal modules, Studio, and Studio tests.

typecheck-studio: ## Run the Studio TypeScript build and draft-test typecheck without Vite.
	$(NPM) exec --prefix apps/studio --offline -- tsc -b apps/studio/tsconfig.json
	$(NPM) --prefix apps/studio run typecheck:tests

test-studio: ## Run Studio draft validation tests.
	$(NPM) --prefix apps/studio test

commitlint: ## Validate a Conventional Commit message piped through stdin.
	$(NPM) run commitlint

##@ Module validation
typecheck-domain: ## Typecheck domain production and test sources.
	$(NPM) run typecheck:domain

test-domain: ## Run domain tests.
	$(NPM) run test:domain

typecheck-contracts: ## Typecheck contracts production and test sources.
	$(NPM) run typecheck:contracts

test-contracts: ## Run contracts tests.
	$(NPM) run test:contracts

typecheck-application: ## Typecheck application production and test sources.
	$(NPM) run typecheck:application

test-application: ## Run application tests.
	$(NPM) run test:application

typecheck-orchestration: ## Typecheck orchestration production and test sources.
	$(NPM) run typecheck:orchestration

test-orchestration: ## Run orchestration tests.
	$(NPM) run test:orchestration

typecheck-persistence: ## Typecheck persistence production and test sources.
	$(NPM) run typecheck:persistence

test-persistence: ## Run persistence tests.
	$(NPM) run test:persistence

typecheck-runtime: ## Typecheck runtime production and test sources.
	$(NPM) run typecheck:runtime

test-runtime: ## Run runtime tests.
	$(NPM) run test:runtime

typecheck-server: ## Typecheck server production and test sources.
	$(NPM) run typecheck:server

test-server: ## Run server tests.
	$(NPM) run test:server

##@ SQLite migrations
db-check: ## Check checked-in Drizzle migration metadata.
	$(NPM) run db:check

db-generate: ## Generate reviewed migration files: MIGRATION_NAME=add_example.
	@$(NODE) -e "if (!/^[a-z][a-z0-9_-]*$$/.test(process.env.MIGRATION_NAME || '')) { console.error('Use: make db-generate MIGRATION_NAME=add_example (lowercase letters, digits, underscores, hyphens).'); process.exitCode = 1; }"
	$(NPM) run db:generate -- --name="$(MIGRATION_NAME)"

##@ Mozaik demos
demo-mozaik: ## Run deterministic inference on the real runtime; no model API calls.
	$(NPM) run demo:mozaik

demo-mozaik-live: ## Opt in to live provider inference against the simulated cart.
	$(NPM) run demo:mozaik -- --live

##@ Dependency audits (network required)
audit: audit-root audit-studio ## Audit root and Studio dependencies; never apply fixes automatically.

audit-root: ## Run npm audit for root dependencies.
	$(NPM) audit

audit-studio: ## Run npm audit for Studio dependencies.
	$(NPM) --prefix apps/studio audit
