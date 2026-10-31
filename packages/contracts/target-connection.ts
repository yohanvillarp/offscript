import { ContractValidationError } from "./errors.ts";
import { oneOf, record, text } from "./validation.ts";

export type TargetSuggestion = Readonly<{ url: string; source: "vite-default" | "vite-script"; scriptName: string }>;
export type TargetConnection = Readonly<{ url: string }> & (
  Readonly<{ kind: "response"; statusCode: number }> |
  Readonly<{ kind: "unreachable" | "timeout" | "tls-error" | "busy" }>
);

/** Restrict explicit connection checks to local HTTP services, without DNS. */
export function parseLocalTargetUrl(value: unknown): string {
  const input = text(value, "target.url").trim();
  try {
    const url = new URL(input);
    if (input.length > 2048 || !/^https?:\/\//i.test(input) || url.username || url.password ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error();
    url.hash = "";
    return url.href;
  } catch { throw new ContractValidationError("target.url", "Use a local HTTP(S) URL with localhost, 127.0.0.1, or [::1], without credentials."); }
}

export function parseTargetSuggestion(value: unknown): TargetSuggestion {
  const input = record(value, "targetSuggestion", ["url", "source", "scriptName"]);
  return Object.freeze({ url: parseLocalTargetUrl(input.url), source: oneOf(input.source, ["vite-default", "vite-script"] as const, "targetSuggestion.source"),
    scriptName: text(input.scriptName, "targetSuggestion.scriptName") });
}

export function parseTargetConnection(value: unknown): TargetConnection {
  const input = record(value, "connection", ["url", "kind", "statusCode"]);
  const url = parseLocalTargetUrl(input.url);
  const kind = oneOf(input.kind, ["response", "unreachable", "timeout", "tls-error", "busy"] as const, "connection.kind");
  if (kind === "response") {
    if (typeof input.statusCode !== "number" || !Number.isInteger(input.statusCode) || input.statusCode < 100 || input.statusCode > 599) {
      throw new ContractValidationError("connection.statusCode", "Expected an HTTP status code.");
    }
    return Object.freeze({ url, kind, statusCode: input.statusCode });
  }
  if (input.statusCode !== undefined) throw new ContractValidationError("connection.statusCode", "Only HTTP responses have a status code.");
  return Object.freeze({ url, kind });
}
