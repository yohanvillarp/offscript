import { PersistenceError } from "../errors.ts";

export function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Reflect.ownKeys(value).some((key) => typeof key !== "string" || !fields.includes(key))) {
    throw new PersistenceError("INVALID_STORED_DATA", "Invalid stored object shape.");
  }
  return value as Record<string, unknown>;
}

export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new PersistenceError("INVALID_STORED_DATA", "Expected stored nonblank text.");
  return value;
}

export function json(value: string): unknown { return JSON.parse(value); }

export function stored<T>(read: () => T): T {
  try { return read(); } catch (cause) {
    if (cause instanceof PersistenceError) throw cause;
    throw new PersistenceError("INVALID_STORED_DATA", "Stored data failed domain/contract validation.", { cause });
  }
}
