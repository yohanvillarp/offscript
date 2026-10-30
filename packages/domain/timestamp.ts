import { DomainError } from "./errors.ts";

export function utcTimestamp(value: string, field: string): string {
  const date = new Date(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new DomainError("INVALID_VALUE", `${field} must be a canonical UTC timestamp.`);
  }
  return value;
}
