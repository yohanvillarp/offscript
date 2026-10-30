export function argumentsObject(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Tool arguments must be an object.");
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !fields.includes(key))) {
    throw new Error("Unknown tool arguments.");
  }
  return value as Record<string, unknown>;
}

export function argumentText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Expected a nonblank text argument.");
  return value;
}
