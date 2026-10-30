import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export type PersistenceOptions = Readonly<{ projectRoot: string; dataDirectory?: string; busyTimeoutMs?: number }>;

export function openConnection(options: PersistenceOptions) {
  if (!options.projectRoot.trim()) throw new Error("An explicit project root is required.");
  if (options.dataDirectory !== undefined && !options.dataDirectory.trim()) throw new Error("Data directory must not be blank.");
  const timeout = options.busyTimeoutMs ?? 2_500;
  if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > 30_000) throw new Error("Busy timeout must be between 0 and 30000 ms.");
  const dataDirectory = resolve(options.projectRoot, options.dataDirectory ?? ".offscript");
  mkdirSync(dataDirectory, { recursive: true });
  const databasePath = resolve(dataDirectory, "offscript.sqlite");
  const client = new Database(databasePath, { timeout });
  try {
    client.pragma("foreign_keys = ON");
    if (client.pragma("journal_mode = WAL", { simple: true }) !== "wal") throw new Error("SQLite WAL mode could not be enabled.");
    client.pragma("synchronous = FULL");
    client.pragma(`busy_timeout = ${timeout}`);
    return { client, db: drizzle(client), databasePath };
  } catch (error) { client.close(); throw error; }
}

export type PersistenceConnection = ReturnType<typeof openConnection>;
export type PersistenceDatabase = PersistenceConnection["db"];
