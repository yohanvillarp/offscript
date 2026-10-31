import assert from "node:assert/strict";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { inspectProject, ProjectInspectionError } from "../index.ts";

function project(t: TestContext) {
  const parent = realpathSync(tmpdir());
  const root = mkdtempSync(join(parent, "offscript-project-"));
  t.after(() => {
    const target = realpathSync(root);
    if (dirname(target) !== parent || !basename(target).startsWith("offscript-project-")) throw new Error("Unexpected cleanup path.");
    rmSync(target, { recursive: true, force: true });
  });
  return root;
}

test("inspection resolves the selected root, suggests package name, and never executes its scripts", async t => {
  const root = project(t);
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@team/checkout", scripts: { prepare: "touch should-not-exist" } }));
  assert.deepEqual(await inspectProject(join(root, ".")), { rootPath: realpathSync(root), suggestedName: "@team/checkout", nameSource: "package" });
  assert.equal(existsSync(join(root, "should-not-exist")), false);
});

test("non-npm projects and unnamed manifests fall back to the directory name", async t => {
  const root = project(t);
  assert.equal((await inspectProject(root)).suggestedName, basename(root));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: " " }));
  assert.equal((await inspectProject(root)).nameSource, "directory");
});

test("invalid project paths and malformed manifests fail without producing a partial descriptor", async t => {
  const root = project(t);
  await assert.rejects(inspectProject(resolve(root, "missing")), ProjectInspectionError);
  writeFileSync(join(root, "package.json"), "{broken");
  await assert.rejects(inspectProject(root), ProjectInspectionError);
});

test("simple Vite scripts suggest an unverified local URL without evaluating configuration or compound commands", async t => {
  const root = project(t);
  writeFileSync(join(root, "vite.config.ts"), "throw new Error('must not evaluate')");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite --port 4301 --host 0.0.0.0" } }));
  assert.deepEqual((await inspectProject(root)).targetSuggestion, { url: "http://localhost:4301/", source: "vite-script", scriptName: "dev" });
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite" } }));
  assert.equal((await inspectProject(root)).targetSuggestion?.source, "vite-default");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { dev: "vite && echo unsafe" } }));
  assert.equal((await inspectProject(root)).targetSuggestion, undefined);
});
