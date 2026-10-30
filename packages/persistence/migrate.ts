import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { PersistenceDatabase } from "./connection.ts";
import { PersistenceError } from "./errors.ts";

const history = sqliteTable("__offscript_migrations", {
  version: integer("version").primaryKey(), hash: text("hash").notNull(), createdAt: integer("created_at").notNull(),
});
const defaultFolder = fileURLToPath(new URL("./migrations", import.meta.url));

export function migrateDatabase(db: PersistenceDatabase, folder = defaultFolder): void {
  try {
    const migrations = readMigrationFiles({ migrationsFolder: folder });
    db.transaction((tx) => {
      tx.run(sql`CREATE TABLE IF NOT EXISTS __offscript_migrations (version INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at INTEGER NOT NULL)`);
      const applied = tx.select().from(history).orderBy(history.version).all();
      if (applied.length > migrations.length) throw new PersistenceError("INCOMPATIBLE_SCHEMA", "Database has migrations unknown to this version.");
      for (const [index, row] of applied.entries()) {
        const migration = migrations[index];
        if (!migration || row.version !== index + 1 || row.hash !== migration.hash || row.createdAt !== migration.folderMillis) {
          throw new PersistenceError("INCOMPATIBLE_SCHEMA", "Migration history or checksum does not match this version.");
        }
      }
      for (let index = applied.length; index < migrations.length; index++) {
        const migration = migrations[index];
        if (!migration) throw new PersistenceError("MIGRATION_FAILED", "Missing migration metadata.");
        for (const statement of migration.sql) if (statement.trim()) tx.run(sql.raw(statement));
        tx.insert(history).values({ version: index + 1, hash: migration.hash, createdAt: migration.folderMillis }).run();
      }
    }, { behavior: "immediate" });
  } catch (cause) {
    if (cause instanceof PersistenceError) throw cause;
    throw new PersistenceError("MIGRATION_FAILED", "Could not apply storage migrations; transaction rolled back.", { cause });
  }
}
