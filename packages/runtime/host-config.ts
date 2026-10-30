import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

export type LocalHostOptions = Readonly<{
  projectRoot: string;
  dataDirectory?: string;
  port?: number;
  allowedOrigins?: readonly string[];
  shutdownTimeoutMs?: number;
  onDiagnostic?: (code: "OUTBOX_FAILED") => void;
}>;

export function localHostConfig(options: LocalHostOptions) {
  if (!options.projectRoot.trim()) throw new Error("An explicit project root is required.");
  const projectRoot = realpathSync(resolve(options.projectRoot));
  if (!statSync(projectRoot).isDirectory()) throw new Error("Project root must be a directory.");
  if (options.dataDirectory !== undefined && !options.dataDirectory.trim()) throw new Error("Data directory must not be blank.");
  const port = options.port ?? 0;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid host port.");
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? 15_000;
  if (!Number.isInteger(shutdownTimeoutMs) || shutdownTimeoutMs < 1 || shutdownTimeoutMs > 60_000) throw new Error("Invalid shutdown timeout.");
  const allowedOrigins = [...options.allowedOrigins ?? []];
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin || url.username || url.password) throw new Error("Expected a canonical HTTP origin.");
  }
  return Object.freeze({ projectRoot, dataDirectory: resolve(projectRoot, options.dataDirectory ?? ".offscript"),
    port, allowedOrigins: Object.freeze(allowedOrigins), shutdownTimeoutMs });
}
