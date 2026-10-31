# Public source and private author context

## Publication boundaries

The public repository keeps application/source code, tests, reviewed migrations, dependency lockfiles, GitHub workflows, LICENSE, README, CONTRIBUTING, AGENTS and technical documentation. Product limitations and meaningful safety requirements remain public; removing personal notes must not conceal unsupported claims.

Author-only context is ignored and removed from the current Git index: `.agents/`, `GEMINI.md`, `docs/ANTIGRAVITY.md` and `docs/ANTIGRAVITY-HANDOFF.md`. `.agent/`, `.gemini/` and `context/` are also ignored for future local use. Existing files remain on the author's disk. Shared coding conventions stay in AGENTS.md without links requiring those private files. Other clones should preserve their own personal copies before updating a commit that removes formerly tracked files.

Never publish `.env`, local registry credentials, authentication state, target databases, captured user evidence, session-entry/access files, logs, browser reports, temporary package trials or generated build output as repository source. Examples must contain only dummy values. The repository's `.gitignore` handles these working-tree artifacts; inspect tracked files separately because ignore rules do not untrack existing entries.

The npm package has a narrower boundary: reviewed compiled runtime, bundled Studio, migrations, manifest, README, LICENSE and required notices. Use the manifest's files allowlist and validate the actual archive; do not rely on `.gitignore` to protect a package that explicitly includes `dist`.

The documentation website publishes only selected public material/assets, with its own build/output. It must not recursively publish every file under docs, the repository root, or captured simulation artifacts.

## Historical exposure

Removing tracking affects future commits after merge, not older commits, forks, downloads, existing npm versions or web caches. The cleanup does not claim historical erasure or a completed secrets audit. Personal instruction files are not automatically secrets. If an actual credential is identified, rotate/revoke it first and separately decide whether coordinated history cleanup is necessary. Do not rewrite public history or force-push as part of this routine release preparation.

## Checks before the public release

- Confirm ignored personal files still exist locally and no longer appear in `git ls-files` after the cleanup is staged.
- Inspect tracked files and intended README/graphics for credentials, personal paths and real user data without dumping secret contents into logs.
- Review `npm pack` metadata and the extracted archive, including source maps and licenses/notices. Reject unexpected tests, source/configuration, personal context and stale assets.
- Use synthetic/demo data for screenshots and recordings. Label controlled fixture output separately from real model-driven exploration.
- Check public links against a fresh clone/archive, where personal ignored files are absent.

The implementation and rollout sequence is proposed in [RELEASE.md](RELEASE.md). This cleanup does not publish a package, modify DNS or deploy the website.
