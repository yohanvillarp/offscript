import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export function createStudioEntryFile(directory: string, access: Readonly<{ origin: string; entry: string }>) {
  const path = join(directory, `.offscript-studio-${process.pid}-${randomUUID()}.html`);
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const content = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Open OFFSCRIPT Studio</title>
<form method="post" action="${escape(access.origin)}/studio/session"><input type="hidden" name="entry" value="${escape(access.entry)}"><button>Open OFFSCRIPT Studio</button></form>
<script>document.querySelector('form').submit()</script></html>`;
  writeFileSync(path, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return Object.freeze({ path, remove() {
    try {
      if (readFileSync(path, "utf8") !== content) throw new Error("Studio entry file changed; it was preserved.");
      unlinkSync(path);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  } });
}
