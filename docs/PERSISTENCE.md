# SQLite persistence foundation

## Installed boundary

The root npm package pins `drizzle-orm` 0.45.4 and `better-sqlite3` 13.0.3. Development tooling pins `drizzle-kit` 0.31.11 and its driver types. The installed native driver was exercised with Node.js 24 on Windows and reports SQLite 3.53.4. CI includes dedicated persistence jobs on Windows, macOS, and Linux; those jobs must run before portability is claimed for a particular revision.

The stable Drizzle version does not export the `node:sqlite` adapter shown by newer prerelease documentation, so this implementation uses its verified `drizzle-orm/better-sqlite3` API. A narrowly scoped override updates the legacy esbuild dependency under `@esbuild-kit/core-utils` to 0.25.12; migration generation/checks are tested with that override. No internal npm package or workspace is introduced.

`packages/persistence/index.ts` exposes `openPersistence`, options, repository interfaces, and persistence errors. Infrastructure imports domain/contracts/application public entry points; those modules do not import SQLite, Drizzle, or row types. The local Fastify host now owns a persistence connection and shared dispatch; see [LOCAL-HOST.md](LOCAL-HOST.md).

## Connection and lifecycle

Call `openPersistence({ projectRoot, dataDirectory?, busyTimeoutMs? })` with an explicit project root. It resolves the default database to `<projectRoot>/.offscript/offscript.sqlite`; a configured absolute or project-relative data directory is supported. The path never depends on where OFFSCRIPT is installed globally or locally by npm.

Opening configures foreign keys, verifies WAL mode, sets `synchronous=FULL`, and applies a bounded busy timeout (default 2500 ms, configurable from 0 to 30000 ms). It does not silently apply migrations. Before using repositories, explicitly call `migrate()` and stop startup if it fails. Always call `close()` when finished; closing twice is safe. Local database/WAL/shared-memory files are ignored by Git.

The implementation uses synchronous SQLite calls behind asynchronous application ports. Transactions contain no asynchronous work, model calls, or event publication. WAL supports readers alongside a writer but still allows only one writer at a time. Busy waiting can block the Node event loop for its configured timeout; high write contention may require a dedicated database worker or a different adapter later. WAL storage must reside on a local filesystem, not a shared network drive. This is not a distributed database design.

## Schema and ownership

| Table | Purpose |
| --- | --- |
| `simulations` | Identity, execution environment, and domain lifecycle. |
| `agents` | Ordered simulation roster, profile JSON, and participation lifecycle; identity is scoped by simulation. |
| `observations` | Author/simulation, observation time, description, opaque location, and evidence-ID JSON. |
| `investigations` | Request metadata, existing domain lifecycle fields, and storage-only revision. |
| `investigation_observations` | Ordered, unique links to observations from the same simulation. |
| `investigation_agents` | Ordered, unique collaborator roster within that simulation. |
| `event_outbox` | Validated request/assignment events, revision ordering, leases, attempts, and acceptance metadata. |
| `simulation_configurations` | Validated setup metadata committed atomically with the initial simulation and roster. |

Composite foreign keys enforce simulation scope for observation authors, requesters, collaborators, and related observations. Unique constraints preserve identity and relationship positions. Indexes support observation lookup by simulation/time and investigations by simulation/status. Status/reason and JSON-shape checks complement domain/contract validation; SQL constraints alone do not certify a valid domain history.

Profiles, goals, declared capabilities, lifecycle reasons, literal descriptions, and existing evidence IDs survive round-trip. There is no evidence-resource table: these IDs remain opaque references with unverified existence/integrity. The schema does not invent skills, permissions, prompts, memory storage, or confirmed findings.

## Repository behavior

- `simulations` implements `SimulationReader` and adds `createSimulation(snapshot)` for explicit snapshot creation. It creates the roster in the same transaction. It does not upsert, mutate lifecycle, start agents, or resume a session.
- `observations` implements `ObservationReader` and adds `createObservation(value)`.
- `investigations` implements the low-level create/assignment ports and atomic `commitRequest`/`commitAssignment` ports. Application commits include the snapshot and pending event; low-level writes deliberately do not enqueue events. New requests start at revision 0.
- `outbox` implements reservation, acknowledgement, deferral, rejection, inspection, and per-simulation pending checks. See [OUTBOX.md](OUTBOX.md) for ordering/retry semantics.

Creation returns `already-exists` for an existing identity without overwriting it. Foreign-key failures are not treated as successful creation. Aggregate writes roll back on failure. Reads involving multiple tables use a transaction so roster/relationship data comes from one SQLite snapshot.

Simulation loading validates profiles and summaries, reconstructs immutable snapshots through domain operations, and rejects inconsistent session/participation states. Observation and investigation loading use existing contract parsers and freeze detached values. Invalid persisted JSON, references, or domain states raise `PersistenceError` instead of being cast to domain objects. Restoring a snapshot does not replay external actions or imply that its original lifecycle history has been authenticated.

Assignment acquires an immediate transaction, validates the current snapshot/revision, and verifies that the requested update is the domain's additive assignment operation. It cannot replace the hypothesis, change simulation, drop existing collaborators, or overwrite a competing revision. A failed collaborator insert rolls back both roster and revision. Missing records and conflicts preserve the existing port results. SQLite/Drizzle operation errors retain their underlying causes for application-level error mapping.

Simulation lifecycle updates, observation edits, investigation completion writes, paginated history, and production runtime wiring are not exposed speculatively. Mozaik runtime state and agent memories remain session-owned. Optional `SessionOptions.storage` now supplies these durable investigation/observation/outbox adapters to an explicitly prepared session; it does not restore runtime state or resume agents. Await session closure before closing its supplied database.

`configurations` now exposes atomic configured creation and metadata reads. Existing simulation creation remains available for snapshot/bootstrap use without fabricating setup metadata. See [SIMULATION-CONFIGURATION.md](SIMULATION-CONFIGURATION.md).

## Migrations

`drizzle.config.ts` and `packages/persistence/schema` define the schema. `npm run db:generate -- --name=<change>` generates SQL and snapshots; `npm run db:check` checks the migration metadata. Review generated SQL before committing. Do not use schema push, reset, or `drizzle-kit migrate` against OFFSCRIPT data: application of migrations uses the module's explicit runner and history table.

`migrate()` reads the checked-in Drizzle SQL/journal artifacts and applies pending statements plus history in a single immediate transaction. `__offscript_migrations` records consecutive versions, journal timestamps, and SHA-256 SQL checksums. This small runner uses Drizzle's migration-file reader/query execution and owns history validation; it does not claim compatibility with the default Drizzle migrator's separate history table.

An unknown future version, edited applied migration, or inconsistent history is rejected. Failed DDL and history insertions roll back together. Repeated migration is a no-op; existing data is preserved. An unmanaged conflicting schema is not reset. Applied migration files must remain immutable and LF-normalized; Git attributes enforce consistent text line endings across platforms. The SQL/journal assets must ship alongside the module when npm packaging is implemented.

There is no automatic downgrade, destructive reset, backup mechanism, or live database copying command. Future migrations remain reviewed code changes; startup must not proceed after a schema compatibility error.

## Verification and next boundary

`npm run typecheck:persistence`, `npm run test:persistence`, and `npm run db:check` are included in root validation. Tests use temporary disk-backed databases, independent connections, restart/reopen, rollback injection, scope constraints, corruption rejection, migration upgrades/checksums, CAS conflicts, and bounded lock contention. The existing request/assignment application cases run against the real repositories without external services or a browser.

The transactional outbox closes the investigation snapshot/event insertion crash gap; original snapshot-only records are not backfilled. Dispatcher acknowledgement and handler execution remain distinct. The local host now composes storage with protected health endpoints and explicit startup/shutdown; simulation-control endpoints, CLI distribution, Studio changes, and real browser exploration remain deferred. See [OUTBOX.md](OUTBOX.md).
