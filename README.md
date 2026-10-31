# OFFSCRIPT

[![npm version](https://img.shields.io/npm/v/@nikelyh/offscript.svg)](https://www.npmjs.com/package/@nikelyh/offscript)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Documentation](https://img.shields.io/badge/Docs-offscript.nikelyh.tech-teal)](https://offscript.nikelyh.tech)

**Your users don't follow a script. Neither do ours.**

Current stable release: **v1.0.0** on [npm](https://www.npmjs.com/package/@nikelyh/offscript).
Online documentation: [offscript.nikelyh.tech](https://offscript.nikelyh.tech).

OFFSCRIPT brings multi-agent software exploration into a local developer workflow: configure a target and goal, choose artificial users, run a bounded session, and inspect observations, investigations and visual evidence in Studio or the terminal.

**Execution mode:** The default browser execution uses deterministic decisions, not live autonomous reasoning. Live inference is currently available only through the separate, opt-in controlled-cart demo.

## What you can do today

- Save a simulation with an application URL, concrete goal, selected users and execution limits.
- Run the controlled cart demo or the deterministic browser integration on an explicitly authorized target.
- Inspect attributed observations, collaborative investigations, available screenshots and uncertainty-aware results.
- Stop execution, recover interrupted records explicitly, and delete eligible configurations that have not started.
- Keep configuration, results and evidence in the selected project's local `.offscript` directory.

Six behavioral profiles are available: Explorer/Raven, Impatient/Fox, Beginner/Compass, Regular/Sparrow, Meticulous/Owl and Distrustful/Badger. Their instructions express different tendencies; the default scripted runner does not demonstrate those differences. An observation or an assigned collaborator is not a confirmed defect.

## Installation & Quick start

### Install via npm (Recommended)

Requires Node.js 24 or later and npm 11.19 or later.

```sh
npm install -g @nikelyh/offscript
```

Or run directly with `npx`:

```sh
npx --yes @nikelyh/offscript@1.0.0 studio
```

For browser exploration, install the required Chromium binary:

```sh
npx playwright install chromium
```

### Launch Studio

In your target project's root directory:

```sh
offscript studio
```

Studio starts locally on a loopback port and opens the secure entry file in your browser. (Use `offscript studio --no-open` to print the entry link without launching the browser automatically).

1. Start your web application separately (e.g. at `http://localhost:5173`).
2. In Studio, select **New simulation**.
3. Enter your target URL and exploration goal, pick your user profiles, and save.
4. Run the simulation and inspect observations, investigations, and visual evidence.

## Quick start from source

Requirements: Node.js 24 or later, npm, Git, and enough disk space for dependencies and Chromium if using browser mode. Native SQLite may require a supported prebuilt binary or platform build tools. Linux browser execution also needs Playwright's system dependencies.

Isolated clean installations passed on Windows with Node 24.21.0/npm 11.19.0. This does not establish cross-platform release readiness; see the [release checkpoint](docs/RELEASE.md#preparation-checkpoint-2026-10-31) for the actual checks and remaining gates.

```sh
git clone https://github.com/yohanvillarp/offscript.git
cd offscript
npm ci
npm --prefix apps/studio ci
```

First, exercise Mozaik without a browser or model account:

```sh
npm run demo:mozaik
```

This starts two users concurrently on the real Mozaik runtime, using deterministic inference and a simulated cart. It prints semantic events followed by observations/investigations, per-agent turn counts and failure stages. A successful fixture run reports no failures. This checks coordination; it is not an autonomous exploration of your application. See [the integration guide](https://github.com/yohanvillarp/offscript/blob/main/docs/MOZAIK-INTEGRATION.md) for the separate `--live` demo and its model/credential requirements; live requests can incur provider costs.

Build Studio and the local executable distribution:

```sh
npm run build:local
npm start -- studio --project "/absolute/path/to/your-app"
```

Use the actual target path, such as `C:/Projects/my-app` on Windows. The host prints a loopback address and opens a local HTML entry file that establishes Studio's authenticated session. Use `studio --no-open` to open that printed file yourself. Do not place access tokens in URLs.

For **browser exploration**, install the browser matching the repository's locked Playwright version before starting a run:

```sh
npm exec -- playwright install chromium
```

On supported Linux environments, the corresponding setup command is `npm exec -- playwright install --with-deps chromium`. Installing browsers/system dependencies is explicit; OFFSCRIPT does not do it silently.

Start your target application separately using that project's instructions. In Studio, choose **New simulation**, review the detected project, enter the target URL and goal, select users, and save. Open the saved simulation to choose its execution mode and inspect results. A successful connection check is not authorization for destructive actions. Use a disposable test environment; browser clicks can change real backend data.

Stop OFFSCRIPT with Ctrl+C. Saved data remains under `<target>/.offscript`; entry/access files are removed on normal shutdown. Add `.offscript/` to the target project's ignore rules yourself. No target scripts are started automatically.

## Try the npm archive in another project

From the OFFSCRIPT checkout:

```sh
npm pack
```

This builds `nikelyh-offscript-1.0.0.tgz`. From your target project's directory:

```sh
npm exec --yes --package="/absolute/path/nikelyh-offscript-1.0.0.tgz" -- offscript studio
```

The current directory becomes the project root. Use a real absolute archive path; Windows paths are supported. npm installs dependencies in its execution cache without adding OFFSCRIPT to the target's package manifest. The first run can need network access and native dependency setup.

For a one-shot archive installation, the browser prerequisite must match OFFSCRIPT's Playwright version; for this source release that is `1.64.1`:

```sh
npm exec --yes --package=playwright@1.64.1 -- playwright install chromium
```

The archive flow above can be used to test a local build independently of the npm registry.

## CLI reference

Arguments follow the executable in an installed package, or `npm start --` in the checkout.

| Command | Behavior |
| --- | --- |
| `offscript studio` | Start local Studio/API and open the secure entry. Default command. |
| `offscript studio --no-open` | Print the entry path without launching a browser. |
| `offscript serve` | Start the API only. |
| `offscript list` | List saved project configurations. |
| `offscript results <id>` | Show observations, investigations and finding assessments. |
| `offscript recover <id> [--cancel]` | Explicitly resolve an interrupted run; does not resume agents. |
| `offscript help [command]` | Print detailed help and option descriptions for any command. |
| `offscript --help` / `--version` | Print general information without starting the host or creating storage. |

Common options: `--project <directory>`, `--port <number>` (0 selects an available port), and `--data-directory <directory>` (relative to the target). Flags override the documented `OFFSCRIPT_*` environment values. The installation directory never determines the target project.

## How Mozaik is used

Each simulation gets a Mozaik runtime. Artificial users have separate identities, memories and tool contexts, while OFFSCRIPT's exploration state holds observations, investigations, permissions and bounded turn admission. Mozaik runs inference/tool turns and reactive situation handlers; OFFSCRIPT does not implement a competing inference loop.

Users can run in parallel. A recorded observation can lead to an investigation request; a peer's reactive handler records assignment before contributing. SQLite's transactional outbox delivers committed investigation events to prepared sessions. Dispatch acceptance does not prove asynchronous work finished or a hypothesis is true.

![OFFSCRIPT local architecture: CLI and Studio, protected host, application rules, Mozaik shared state, concurrent users, browser contexts and SQLite.](https://raw.githubusercontent.com/yohanvillarp/offscript/main/docs/assets/architecture.svg)

![Illustrative Mozaik collaboration sequence: independent users, shared observation, investigation reaction and persisted assignment.](https://raw.githubusercontent.com/yohanvillarp/offscript/main/docs/assets/collaboration.svg)

These are explanatory diagrams, not captured evidence of live model behavior. Editable Mermaid sources live beside the SVGs in `docs/assets`.

## Current boundaries

- Default Studio browser execution is deterministic. Provider setup for autonomous browser exploration is not exposed as a finished operator workflow.
- Tool/origin restrictions and isolated contexts are implemented, but a general destructive-action policy, broader target authentication and complete secret redaction are not.
- Browser storage isolation does not isolate backend accounts or records. Use authorized test accounts/data.
- Goal achievement, independent corroboration and artifact availability are distinct. Provisional results must not be treated as verified defects.
- Session closure is not a guarantee that a provider has aborted an in-flight request. There is no automatic agent resumption after restart.
- The native SQLite driver and matching browser binaries are platform requirements; install/run qualification is needed on each supported platform.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `Distribution is missing` | Run `npm install -g @nikelyh/offscript` or `npm run build:local` in the checkout. |
| Chromium executable missing | Install Chromium using `npx playwright install chromium`. |
| `401` when entering Studio | Open the current host's printed HTML entry; an old entry/session does not authenticate a restarted host. |
| Connection check fails | Start the target separately; verify its actual URL/port. Checks currently support loopback targets. |
| `ENOSPC` during install/pack | Free space on the project, npm-cache and browser-cache volumes, then retry. Do not delete project `.offscript` data to repair packaging. |
| Interrupted simulation | Inspect its results and use explicit recovery. Recovery records an outcome rather than resuming browser/provider work. |

## Documentation and contributing

[Official Documentation](https://offscript.nikelyh.tech) · [Architecture](https://github.com/yohanvillarp/offscript/blob/main/docs/ARCHITECTURE.md) · [Browser adapter](https://github.com/yohanvillarp/offscript/blob/main/docs/BROWSER-INTERACTION.md) · [Mozaik integration](https://github.com/yohanvillarp/offscript/blob/main/docs/MOZAIK-INTEGRATION.md) · [Known limits](https://github.com/yohanvillarp/offscript/blob/main/docs/CONSOLIDATION.md) · [Roadmap](https://github.com/yohanvillarp/offscript/blob/main/docs/ROADMAP.md) · [Contributing](https://github.com/yohanvillarp/offscript/blob/main/CONTRIBUTING.md)

Visit the documentation portal at **[offscript.nikelyh.tech](https://offscript.nikelyh.tech)**. Development commands, checks and release notes are documented in the repository. No browser or live model call is required for reading the guides.

Apache-2.0. See [LICENSE](https://github.com/yohanvillarp/offscript/blob/main/LICENSE) and [third-party notices](https://github.com/yohanvillarp/offscript/blob/main/THIRD_PARTY_NOTICES.md). Studio's bundled fonts retain their SIL Open Font License texts in the archive.
