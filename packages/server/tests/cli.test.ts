import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { openBrowser } from "../../../scripts/server/open-browser.ts";
import { openPersistence } from "../../persistence/index.ts";
import { simulationId, transitionSimulation } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { executeConfigureSimulation } from "../../application/index.ts";

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

test("list and results commands inspect project data and report missing records", async () => {
  const root = mkdtempSync(join(tmpdir(), "offscript-cli-data-"));
  try {
    const emptyList = spawnSync(process.execPath, [launcher, "list", "--project", root], { encoding: "utf8" });
    assert.equal(emptyList.status, 0);
    assert.ok(emptyList.stdout.includes("No saved simulations found in this project."));

    const persistence = openPersistence({ projectRoot: root });
    persistence.migrate();
    const simId = simulationId("sim-cli-inspect");
    await executeConfigureSimulation({
      simulationId: simId,
      projectRoot: root,
      setup: parseSimulationSetup({
        name: "CLI Test Sim",
        targetUrl: "http://localhost:5173",
        environment: { kind: "web", deployment: "local" },
        goal: "Test CLI inspection workflow",
        userProfileIds: ["explorer", "beginner"],
      }),
    }, {
      projects: {
        inspectProject: async () => ({ rootPath: root, suggestedName: "CLI Test", nameSource: "directory" }),
      },
      configurations: persistence.configurations,
    });
    persistence.close();

    const populatedList = spawnSync(process.execPath, [launcher, "list", "--project", root], { encoding: "utf8" });
    assert.equal(populatedList.status, 0);
    assert.ok(populatedList.stdout.includes("CLI Test Sim"));
    assert.ok(populatedList.stdout.includes("sim-cli-inspect"));

    const missingResult = spawnSync(process.execPath, [launcher, "results", "unknown-sim", "--project", root], { encoding: "utf8" });
    assert.equal(missingResult.status, 1);
    assert.ok(missingResult.stderr.includes("Simulation not found"));

    const populatedResult = spawnSync(process.execPath, [launcher, "results", "sim-cli-inspect", "--project", root], { encoding: "utf8" });
    assert.equal(populatedResult.status, 0);
    assert.ok(populatedResult.stdout.includes("Simulation: CLI Test Sim (sim-cli-inspect)"));
    assert.ok(populatedResult.stdout.includes("--- Findings (0) ---"));
    assert.ok(populatedResult.stdout.includes("--- Observations (0) ---"));

    // Emulate host interruption and verify recovery via CLI
    const persistence2 = openPersistence({ projectRoot: root });
    const simRecord = await persistence2.simulations.findSimulation(simId);
    assert.ok(simRecord);
    const runningSim = transitionSimulation(simRecord, { status: "running" });
    await persistence2.simulations.updateSimulationAggregate(runningSim, { status: "created" });
    persistence2.close();

    const recoverResult = spawnSync(process.execPath, [launcher, "recover", "sim-cli-inspect", "--project", root], { encoding: "utf8" });
    assert.equal(recoverResult.status, 0);
    assert.ok(recoverResult.stdout.includes("recovered to failed"));
  } finally {
    try {
      rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    } catch {
      // Best-effort cleanup on Windows if locked by OS
    }
  }
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
