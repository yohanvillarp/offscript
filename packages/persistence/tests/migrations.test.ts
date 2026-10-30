import assert from "node:assert/strict";
import { appendFileSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrateDatabase } from "../migrate.ts";
import { PersistenceError } from "../index.ts";
import { fixture, storage } from "./fixtures.ts";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const migrationCount = readMigrationFiles({ migrationsFolder }).length;
function count(client: ReturnType<ReturnType<typeof storage>["raw"]>["client"]) {
  return client.prepare<[], { count: number }>("SELECT count(*) AS count FROM __offscript_migrations").get()?.count;
}

test("opening does not migrate silently; migrations are explicit, repeatable, and project-scoped", async (t) => {
  const temp = storage(t); const db = temp.open(); const raw = temp.raw();
  assert.equal(raw.client.prepare("SELECT name FROM sqlite_master WHERE name = 'simulations'").get(), undefined);
  db.migrate(); db.migrate();
  assert.equal(count(raw.client), migrationCount);
  await db.simulations.createSimulation(fixture().simulation);
  db.migrate();
  assert.deepEqual(await db.simulations.findSimulation(fixture().simulation.id), fixture().simulation);
  assert.equal(raw.client.pragma("foreign_keys", { simple: true }), 1);
  assert.equal(raw.client.pragma("journal_mode", { simple: true }), "wal");
  assert.equal(raw.client.pragma("synchronous", { simple: true }), 2);
  assert.equal(raw.client.pragma("busy_timeout", { simple: true }), 2_500);
  assert.ok(db.databasePath.startsWith(temp.root));
});

test("unknown future migration history is rejected without modifying stored records", async (t) => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const raw = temp.raw();
  await db.simulations.createSimulation(fixture().simulation);
  raw.client.prepare("INSERT INTO __offscript_migrations VALUES (?, 'unknown-future-hash', 9999999999999)").run(migrationCount + 1);
  assert.throws(() => db.migrate(), (error: unknown) => error instanceof PersistenceError && error.code === "INCOMPATIBLE_SCHEMA");
  assert.equal(count(raw.client), migrationCount + 1);
  assert.deepEqual(await db.simulations.findSimulation(fixture().simulation.id), fixture().simulation);
});

test("edited applied migration checksums are rejected", (t) => {
  const temp = storage(t); const db = temp.open(); db.migrate(); const raw = temp.raw();
  const copy = join(temp.root, "migration-copy");
  cpSync(migrationsFolder, copy, { recursive: true });
  appendFileSync(join(copy, "0000_initial_domain_storage.sql"), "\n-- modified migration\n");
  assert.throws(() => migrateDatabase(raw.db, copy), (error: unknown) => error instanceof PersistenceError && error.code === "INCOMPATIBLE_SCHEMA");
  assert.equal(count(raw.client), migrationCount);
});

for (const fail of [false, true]) {
  test(`a pending migration ${fail ? "rolls back DDL and history on failure" : "applies once and preserves existing data"}`, async (t) => {
    const temp = storage(t); const db = temp.open(); db.migrate(); const raw = temp.raw();
    await db.simulations.createSimulation(fixture().simulation);
    const copy = join(temp.root, "migration-copy"); cpSync(migrationsFolder, copy, { recursive: true });
    const journalPath = join(copy, "meta", "_journal.json");
    const journal: { entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[] } = JSON.parse(readFileSync(journalPath, "utf8"));
    const previous = journal.entries.at(-1); assert.ok(previous);
    journal.entries.push({ idx: journal.entries.length, version: previous.version, when: previous.when + 1, tag: "0001_test_upgrade", breakpoints: true });
    writeFileSync(journalPath, JSON.stringify(journal));
    writeFileSync(join(copy, "0001_test_upgrade.sql"), `CREATE TABLE migration_probe (value TEXT NOT NULL);\n--> statement-breakpoint\n${fail ? "INVALID SQL;" : "INSERT INTO migration_probe VALUES ('applied');"}`);
    if (fail) {
      assert.throws(() => migrateDatabase(raw.db, copy), (error: unknown) => error instanceof PersistenceError && error.code === "MIGRATION_FAILED");
      assert.equal(raw.client.prepare("SELECT name FROM sqlite_master WHERE name = 'migration_probe'").get(), undefined);
      assert.equal(count(raw.client), migrationCount);
    } else {
      migrateDatabase(raw.db, copy); migrateDatabase(raw.db, copy);
      assert.equal(count(raw.client), migrationCount + 1);
      assert.deepEqual(raw.client.prepare("SELECT value FROM migration_probe").all(), [{ value: "applied" }]);
    }
    assert.deepEqual(await db.simulations.findSimulation(fixture().simulation.id), fixture().simulation);
  });
}

test("invalid configuration is rejected before opening a connection", (t) => {
  const temp = storage(t);
  assert.throws(() => temp.open({ projectRoot: " " }), /project root/);
  assert.throws(() => temp.open({ dataDirectory: " " }), /Data directory/);
  for (const busyTimeoutMs of [-1, 0.5, Infinity, 30_001]) assert.throws(() => temp.open({ busyTimeoutMs }), /Busy timeout/);
});

test("an unmanaged existing schema is not reset or overwritten by migration", (t) => {
  const temp = storage(t); const raw = temp.raw();
  raw.client.exec("CREATE TABLE simulations (legacy TEXT); INSERT INTO simulations VALUES ('preserve');");
  const db = temp.open();
  assert.throws(() => db.migrate(), PersistenceError);
  assert.deepEqual(raw.client.prepare("SELECT legacy FROM simulations").all(), [{ legacy: "preserve" }]);
  assert.equal(raw.client.prepare("SELECT name FROM sqlite_master WHERE name = '__offscript_migrations'").get(), undefined);
});
