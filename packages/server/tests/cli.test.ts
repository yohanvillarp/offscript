import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { openBrowser } from "../../../scripts/server/open-browser.ts";

const launcher = fileURLToPath(new URL("../../../offscript.mjs", import.meta.url));

test("help, version and rejected arguments do not create project resources", () => {
  const root = mkdtempSync(join(tmpdir(), "offscript-cli-"));
  try {
    for (const args of [["--help"], ["--version"], ["serve", "--no-open"], ["studio", "--no-studio"],
      ["unknown"], ["--port", "65536"], ["--project", join(root, "missing")]]) {
      const result = spawnSync(process.execPath, [launcher, ...args], { cwd: root, encoding: "utf8",
        env: { ...process.env, OFFSCRIPT_PROJECT_ROOT: root } });
      assert.equal(result.status, args[0] === "--help" || args[0] === "--version" ? 0 : 1);
    }
    assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true }); }
});

test("browser delegation passes an encoded file URL without shell interpretation and reports failure", async () => {
  const path = resolve("space & special # entry.html");
  for (const platform of ["win32", "darwin", "linux"] as const) {
    const launch: NonNullable<Parameters<typeof openBrowser>[2]> = (command, args, options) => {
      assert.equal(command, platform === "win32" ? "rundll32.exe" : platform === "darwin" ? "open" : "xdg-open");
      assert.deepEqual(args, platform === "win32" ? ["url.dll,FileProtocolHandler", pathToFileURL(path).href] : [pathToFileURL(path).href]);
      assert.equal(options?.shell, false);
      return spawn(process.execPath, ["-e", "process.exit(1)"], { stdio: "ignore" });
    };
    await assert.rejects(openBrowser(path, platform, launch), /launcher failed/);
  }
});
