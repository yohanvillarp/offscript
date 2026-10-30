# Local runtime host

## HTTP contract

The host binds only to `127.0.0.1`. Every route requires `Authorization: Bearer <token>` using a fresh, random token for that host instance. The `Host` header must match `127.0.0.1` or `localhost` at the listening port. Browser origins are denied unless same-origin or explicitly allowed; CORS is not enabled. Tokens never belong in query strings, request logs, or response bodies.

| Method and path | Success | Unavailable |
| --- | --- | --- |
| `GET /health/live` | `200 {"status":"alive"}` | Process/socket no longer available after shutdown. |
| `GET /health/ready` | `200 {"status":"ready"}` | `503 {"status":"not-ready"}` while the host is not ready. |

Errors use `{"error":"<code>"}`: `401 UNAUTHORIZED`, `403 HOST_NOT_ALLOWED` or `ORIGIN_NOT_ALLOWED`, `404 NOT_FOUND`, `400 INVALID_REQUEST`, and `500 INTERNAL_ERROR`. HTTP responses never expose database paths, credentials, exceptions, observations, or agent state. Route JSON schemas in `packages/server` are the executable contract.

Readiness means host initialization succeeded and shutdown has not begun. It does not imply active agents, an empty outbox, completed handlers, or successful investigations. There are no simulation-control endpoints in this increment.

## Ownership and startup

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

No origins are allowed by default except the actual same origin. Programmatic callers may omit `Origin`. Explicitly allowed origins are checked but no CORS headers or preflight support are added; browser/Studio transport is a subsequent task. Forwarded host headers are not trusted. Application/tool permissions remain separate from host authentication.

## Verification and deferred work

`npm run typecheck:server` and `npm run test:server` cover schemas, authentication, authority/origin checks, minimal errors, and credential-file handling. Runtime tests cover real TCP listening/closure, token rotation, partial startup rollback, migration failure, preservation/reopen, dispatcher failure, explicit session routing, storage draining, and shutdown errors/timeouts. An orchestration test runs two real Mozaik runtimes with deterministic inference through the single host dispatcher and verifies zero session-owned claims. No browser or live model requests are required.

All checks are included in `npm run check`. The source was exercised locally on Windows; running existing CI on other operating systems remains necessary before claiming cross-platform execution for this revision. Fastify's [server](https://fastify.dev/docs/latest/Reference/Server/) and [hook](https://fastify.dev/docs/latest/Reference/Hooks/) contracts inform the adapter; tests verify the installed version.

Simulation create/start/stop HTTP routes, saved setup, lifecycle mutation services, Playwright, streaming, Studio wiring, distributed membership, and automatic recovery remain deferred. The next milestone connects explicit simulation configuration and operator control to this host.
