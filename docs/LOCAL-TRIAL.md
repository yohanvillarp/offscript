# Try OFFSCRIPT against another local project

## What currently works

This increment recognizes a selected local project, proposes its name, serves Studio and the API together, and saves/reloads simulation configurations in that project's `.offscript` directory. It does not start autonomous exploration, launch the target's development server, discover its URL, or perform browser actions. Application URL remains editable; simple Vite scripts receive an unverified suggestion. Use Check connection to explicitly contact a local target.

Use Node.js 24 and npm. From the OFFSCRIPT checkout, install the root and Studio dependencies if needed:

```sh
npm ci
npm --prefix apps/studio ci
```

## Option A: run directly from the checkout

Build the local distribution once, then select the application project:

```sh
npm run build:local
npm start -- studio --project "C:/Projects/my-application"
```

On macOS/Linux use the actual path, for example `/Users/me/projects/my-application`. An optional `--port 4317` chooses a fixed loopback port; otherwise an available port is selected. `--data-directory <path>` changes storage, resolving relative paths against the selected project. `serve` runs the API host only; `--no-studio` remains its legacy alias. `studio --no-open` leaves browser opening to you. Bare invocation defaults to `studio`. `--help` and `--version` do not start the host or create storage. Flags override `OFFSCRIPT_PROJECT_ROOT`, `OFFSCRIPT_PORT`, and `OFFSCRIPT_DATA_DIRECTORY`, then defaults apply. Invalid arguments and startup failures exit with code 1.

The package uses compiled JavaScript because Node's TypeScript stripping is not available for dependencies under `node_modules`. Migrations and built Studio assets ship with that JavaScript. Rebuild after source changes; running `npm start` does not rebuild or launch Vite.

## Option B: use a local npm archive through npm exec or npx

From the OFFSCRIPT checkout:

```sh
npm pack
```

The `prepack` script builds the complete local distribution. The current local version produces `offscript-0.0.0.tgz` in the checkout. The archive is ignored by Git. It contains the compiled server, migrations, Studio, and a minimal `offscript` executable; it excludes local project data and credentials.

From the application project's directory, run:

```sh
npm exec --yes --package="C:/Tools/offscript/offscript-0.0.0.tgz" -- offscript
```

Equivalent npx invocation:

```sh
npx --yes --package="C:/Tools/offscript/offscript-0.0.0.tgz" offscript
```

Replace the archive path with its real absolute path. On macOS/Linux use the appropriate filesystem path. Since the command runs in your application directory, that directory becomes the project root. You can still pass `--project "another/path"` explicitly.

This is an unpublished local package, not an instruction to run `npx offscript` from the public registry. The root package remains private. npm installs archive dependencies into its execution cache; registry access may be required on first use. The SQLite driver is native, so an environment without a matching prebuilt binary may require native build tools. The command does not add OFFSCRIPT to the application's dependency manifest.

## Enter Studio

The terminal prints:

- The host address, such as `http://127.0.0.1:<port>`.
- A private local access JSON path for programmatic bearer access.
- A local `.offscript-studio-<pid>-<random>.html` entry path.

Studio attempts to open the printed HTML entry using the operating system browser handler after the host is ready. With `--no-open`, or if launching fails, open the printed HTML file manually, for example by double-clicking it in the file manager. A successful launcher exit does not guarantee browser navigation succeeded; the printed path remains available. It posts a one-time credential to the loopback host and redirects to Studio. If automatic submission is blocked by the browser, use the page's **Open OFFSCRIPT Studio** button. Do not copy the bearer token into a URL, Vite configuration, or browser storage.

The entry is single-use and expires after five minutes. Once entered, refreshing Studio continues using its host-only HttpOnly, SameSite=Strict API cookie and a same-origin request header. Restart the command to obtain a new entry if it expired before use. A host restart also requires its new entry. Keep the selected project's data directory private; Windows ACL isolation is not established by POSIX file mode bits.

Do not use `make dev-studio`, `vite preview`, or a separate Vite origin for this connected trial. The built Studio is served by the selected host on the same origin; standalone Vite remains useful for UI development but has no automatic host credentials or proxy.

## Exercise the flow

1. Choose **New simulation** and continue past the first-visit introduction.
2. Confirm the detected project path and suggested name. Edit the simulation name if desired.
3. Review or enter the target URL and a concrete goal. Use **Check connection** to check local availability if desired. If you want the target itself running, start it separately using that project's normal command; OFFSCRIPT does not do so.
4. Select Raven/Explorer, Fox/Impatient, and/or Compass/Beginner.
5. Review the summary. Expand **Execution limits** if you want to change the stored defaults.
6. Choose **Save simulation**. Studio reads the saved record back before confirming success.
7. Return to the simulations list. Select the simulation name to inspect its goal, project, users, ID, and limits in the detail panel; refresh to reload persisted records.
8. Stop OFFSCRIPT with Ctrl+C, run it again against the same project, enter via the new local file, and verify that the saved configuration remains.

The database lives at `<project>/.offscript/offscript.sqlite` by default. Entry/access files are removed on normal shutdown; saved configurations remain. A crash may leave stale access files, but their credentials do not authenticate a new host. If committing the target project, ignore `.offscript/` in that project's own Git configuration; OFFSCRIPT deliberately does not edit it.

## Verification scope

Automated HTTP tests cover authentication, one-time exchange/replay rejection, cookie/header requirements, validation, duplicates, save/read/list/restart, and static-file confinement. A local archive was installed via `npm exec` from a separate temporary project and exercised through the real listening server, including bundled assets and persisted configuration. No interactive browser QA or real target exploration is claimed; visual interaction is left for manual review.


## API-only, CLI inspection and unattended usage

```sh
# Start Studio without opening a browser
npm exec --yes --package="/absolute/path/offscript-0.0.0.tgz" -- offscript studio --no-open

# Start API host only
npm exec --yes --package="/absolute/path/offscript-0.0.0.tgz" -- offscript serve --port 4317

# List saved simulations directly from project SQLite storage
npm exec --yes --package="/absolute/path/offscript-0.0.0.tgz" -- offscript list

# Inspect exploration results (findings, observations, investigations) in the terminal
npm exec --yes --package="/absolute/path/offscript-0.0.0.tgz" -- offscript results <simulation-id>
```

For an optional global-install trial, use `npm install --global --prefix <temporary-directory> <archive>` and run that prefix's executable (on Windows, `<prefix>/offscript.cmd`; on macOS/Linux, `<prefix>/bin/offscript`). This tests installation without modifying your normal global prefix. `npm pack` remains the primary distribution check; there is no OFFSCRIPT packaging command. Publishing to npm is a separate, unimplemented release workflow.

The opener delegates an encoded file URL without a shell to Windows `rundll32`, macOS `open`, or Linux `xdg-open`. Desktop handlers are environment-dependent; automated checks substitute the launcher and never open a real browser. Ctrl+C/SIGTERM retain host cleanup ownership. API-only mode creates no Studio entry.
