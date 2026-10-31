# Local runtime host

## Current validation limits

The host exposes controlled-demo and browser-exploration execution, results, recovery and initial evidence retrieval. The normal CLI browser factory defaults to deterministic inference. The coordinator can report terminal state after swallowed persistence/close failures, and restored status does not preserve all execution metadata. The evidence endpoint currently replaces the security hook's no-store header with public caching. These are known gaps, not established guarantees; see [CONSOLIDATION.md](CONSOLIDATION.md), C1-C4, before planning the next slice.

## HTTP contract

The configuration transport increment adds authenticated `GET /api/project`, `POST /api/simulations` (`{simulationId, setup}`), `GET /api/simulations/:id`, and `GET /api/simulations` (the latest 50 saved configurations). Creation returns 201 with configuration metadata, duplicates 409, missing records 404, and invalid setup 400 with a safe field path. Creation never starts agents. Existing bearer access remains supported.

Simulation execution control adds authenticated `POST /api/simulations/:id/start`, `GET /api/simulations/:id/execution`, and `POST /api/simulations/:id/stop`. Starting requires an explicit `{ mode: "controlled-demo" }` or `{ mode: "browser-exploration" }` body. Controlled demo runs agents against the simulated local cart fixture, whereas browser exploration navigates and interacts with the configured target application URL via Playwright in isolated browser contexts. Duplicate starts or invalid states return 409 `EXECUTION_CONFLICT`. Stopping attempts session closure and domain cancellation; following C3 consolidation, closure and persistence errors are propagated as explicit failures (`SESSION_CLOSE_FAILED`, `SETTLEMENT_STORAGE_FAILED`), and terminal phases report `activeAgents: []`. In-memory controller phases (`idle`, `starting`, `running`, `stopping`, `completed`, `failed`, `cancelled`, `interrupted`) remain distinct from domain lifecycle states; a simulation found `running` in SQLite after host restart is reported as `interrupted` without automatic resumption or fabricated modes.


When built Studio assets are enabled, the host serves their fixed directory on the same origin. A local entry HTML file submits the instance credential in a POST body to `/studio/session`; it is never placed in a URL. A successful exchange rotates the entry credential and establishes a host-only HttpOnly, SameSite=Strict cookie scoped to the API. Browser API calls must send the same-origin `X-Offscript-Client: studio` header, and cross-origin exchanges remain rejected except the authenticated local-file entry POST. The public asset shell contains no project data or credentials. Failed exchanges do not set cookies. No tokens enter browser storage.

Local-file entry POSTs may carry `Origin: null` or omit Origin, including cross-site fetch metadata. Both still require the expiring one-time body credential; explicit foreign origins remain rejected. Public Studio GET assets accept cross-site navigation metadata so the post-exchange redirect can load. Host validation still applies to all requests, and protected APIs retain origin and authentication checks.

The host binds only to `127.0.0.1`. Programmatic health/API access requires `Authorization: Bearer <token>` using a fresh token for that host instance. Enabled Studio assets are public, while browser configuration APIs require an authenticated session cookie and client header as described below. The `Host` header must match `127.0.0.1` or `localhost` at the listening port. Browser origins are denied unless same-origin or explicitly allowed; CORS is not enabled. Tokens never belong in query strings, request logs, or response bodies.

| Method and path | Success | Unavailable |
| --- | --- | --- |
| `GET /health/live` | `200 {"status":"alive"}` | Process/socket no longer available after shutdown. |
| `GET /health/ready` | `200 {"status":"ready"}` | `503 {"status":"not-ready"}` while the host is not ready. |

Errors use `{"error":"<code>"}`: `401 UNAUTHORIZED`, `403 HOST_NOT_ALLOWED` or `ORIGIN_NOT_ALLOWED`, `404 NOT_FOUND`, `400 INVALID_REQUEST`, and `500 INTERNAL_ERROR`. Health/error responses do not expose database paths, credentials, internal exceptions or observation content. Authenticated results/execution endpoints intentionally return their public contracts. Route JSON schemas in `packages/server` are the executable contract.

Readiness means host initialization succeeded and shutdown has not begun. It does not imply active agents, an empty outbox, completed handlers, or successful investigations. There are no simulation-control endpoints in this increment.

## Ownership and startup

Saved configuration deletion is available through authenticated `DELETE /api/simulations/:id`: 204 (empty body), 404 (missing configuration), or 409 `DELETION_NOT_ALLOWED`. Simulations that are not actively running are eligible. The host excludes active/preparing sessions and blocks registration while deletion is admitted; SQLite rechecks persisted conditions and cleans up dependent records atomically. Associated evidence files on disk are removed. See SIMULATION-CONFIGURATION.md. Active executions must be stopped before deletion is admitted.

`packages/runtime/host.ts` exposes `createLocalHost(options)` and host option/context types. It composes SQLite, one outbox dispatcher, an in-process session registry, and the HTTP adapter in `packages/server`. Fastify 5.12.7 is pinned in the root npm package. The existing scheduler-only entry point stays separate, so standalone Mozaik sessions do not load the HTTP/database composition through their dispatcher import.

Construction validates the explicit project directory, optional data directory, port, origin allowlist, and shutdown timeout before opening resources. `start()` opens SQLite, applies checked migrations, prepares Fastify, binds loopback, and starts the dispatcher. Repeated starts share initialization; failures release acquired resources. A closed host cannot restart. Port 0, the default, selects an available port. The project root is resolved independently of the installation directory.

`credentials()` is a trusted in-process API available after startup. It returns the listening origin and a fresh 256-bit bearer token. Tokens rotate for each host instance and are not HTTP response fields. A storage/dispatcher error marks the host failed, making readiness return 503 and preventing new session preparation. Diagnostics contain only a fixed `OUTBOX_FAILED` code; they do not expose exception contents. The development entry stops on this diagnostic.

## Explicit Mozaik composition

Startup never reads saved simulations to construct agents. `prepareSession(simulationId, factory)` is a trusted local composition API, not an HTTP endpoint. The caller prepares the domain simulation/roster in storage and supplies a factory. The context provides guarded storage and `outboxMode: "external"`; pass both to `createExplorationSession` so the session does not create or poll its own dispatcher. Standalone sessions retain session-owned dispatch by default. External mode requires supplied storage.

The host's shared dispatcher resolves events only against explicitly registered sessions. Missing/inactive sessions defer without consuming attempts; dispatch acceptance still does not acknowledge asynchronous processing. Duplicate registration is rejected before calling the factory. The registry owns session handles, not domain truth or Mozaik shared state. This increment does not provide cross-process simulation ownership or automatic agent recovery.

## Shutdown

`close()` immediately stops new session admission, closes HTTP, closes registered sessions and stops publication, drains admitted storage operations, and finally closes SQLite. Repeated calls share the same result. A session close rejection does not skip the other closures or database cleanup.

The configurable shutdown deadline defaults to 15 seconds (maximum 60 seconds). Exceeding it rejects closure while safe cleanup continues; storage is not force-closed underneath pending work. The host dispatcher uses the existing bounded retry policy and a one-second publication timeout. Session closure is not proof of provider cancellation: previously started provider/tool work can outlive it, and later database operations are rejected after the storage gate drains. There is no forced process exit, automatic domain completion, or claim that a timed-out operation was cancelled.

## Development entry

Run `npm run dev:server` with Node.js 24. It uses the working directory as the default project root; shell variables `OFFSCRIPT_PROJECT_ROOT`, `OFFSCRIPT_DATA_DIRECTORY`, and `OFFSCRIPT_PORT` override configuration. The script does not automatically read `.env`. This is a development entry, not the final distributable CLI.

The entry prints the listening address and the path of an access file inside the configured data directory. It never prints the token. The uniquely named `.offscript-host-<pid>-<random>.json` contains `{origin, token}`, is created exclusively with mode 0600, and is removed on normal SIGINT/SIGTERM shutdown. Git ignores that filename pattern even in a custom data directory. POSIX mode bits do not establish Windows ACL isolation; protect the project/data directory with appropriate operating-system access controls. A crash can leave a stale file; tokens are instance-specific. Cleanup preserves a file whose contents have changed. No token is committed or returned by health routes.

Except for the credential-authenticated local-file entry POST, no origins are allowed by default except the actual same origin. Programmatic callers may omit `Origin`. Explicitly allowed origins are checked but no CORS headers or preflight support are added; same-origin browser/Studio transport is implemented; general cross-origin access is not enabled. Forwarded host headers are not trusted. Application/tool permissions remain separate from host authentication.

## Verification and deferred work

`npm run typecheck:server` and `npm run test:server` cover schemas, authentication, authority/origin checks, minimal errors, and credential-file handling. Runtime tests cover real TCP listening/closure, token rotation, partial startup rollback, migration failure, preservation/reopen, dispatcher failure, explicit session routing, storage draining, and shutdown errors/timeouts. An orchestration test runs two real Mozaik runtimes with deterministic inference through the single host dispatcher and verifies zero session-owned claims. No browser or live model requests are required.

All checks are included in `npm run check`. The source was exercised locally on Windows; running existing CI on other operating systems remains necessary before claiming cross-platform execution for this revision. Fastify's [server](https://fastify.dev/docs/latest/Reference/Server/) and [hook](https://fastify.dev/docs/latest/Reference/Hooks/) contracts inform the adapter; tests verify the installed version.

Trusted project recognition and saved setup creation/read methods are now implemented; see [SIMULATION-CONFIGURATION.md](SIMULATION-CONFIGURATION.md). Configuration create/read/list routes and Studio wiring are now implemented; see [LOCAL-TRIAL.md](LOCAL-TRIAL.md). Simulation execution control (start, inspect, stop), natural session completion settlement, explicit interruption recovery (`POST /api/simulations/:id/recover` and CLI `offscript recover <id> [--cancel]`), and results inspection are now implemented. Automatic agent resumption and distributed membership remain deferred.
