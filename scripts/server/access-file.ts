import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export function createHostAccessFile(directory: string, access: Readonly<{ origin: string; token: string }>) {
  const path = join(directory, `.offscript-host-${process.pid}-${randomUUID()}.json`);
  const content = JSON.stringify({ origin: access.origin, token: access.token }, null, 2) + "\n";
  writeFileSync(path, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return Object.freeze({ path,
    remove() {
      try {
        if (readFileSync(path, "utf8") !== content) throw new Error("Host access file was modified; it was preserved.");
        unlinkSync(path);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
    },
  });
}
