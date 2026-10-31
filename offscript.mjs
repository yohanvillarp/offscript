#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

function resolveCliScript() {
  const dist = new URL("./dist/scripts/server/cli-results.js", import.meta.url);
  try {
    if (statSync(dist).isFile()) return dist.href;
  } catch {}
  const dev = new URL("./scripts/server/cli-results.ts", import.meta.url);
  try {
    if (statSync(dev).isFile()) return dev.href;
  } catch {}
  throw new Error("Distribution is missing. Run npm run build:local in the OFFSCRIPT checkout, or reinstall the archive.");
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    project: { type: "string" }, port: { type: "string" }, "data-directory": { type: "string" },
    "no-studio": { type: "boolean" }, "no-open": { type: "boolean" },
    help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" },
  } });
  const command = positionals[0];
  const isResults = command === "results";
  const validCommands = ["studio", "serve", "list", "results"];
  if (
    (command !== undefined && !validCommands.includes(command)) ||
    (isResults && positionals.length !== 2) ||
    (!isResults && positionals.length > 1)
  ) {
    throw new Error("Expected studio, serve, list, or results <simulation-id>. Use --help for usage.");
  }
  if ((command === "studio" && values["no-studio"]) ||
      ((command === "serve" || values["no-studio"]) && values["no-open"]) ||
      ((command === "list" || isResults) && (values["no-studio"] || values["no-open"] || values.port))) {
    throw new Error("Conflicting options for command. Use --help for usage.");
  }
  if (values.help) {
    console.log(`Usage: offscript [command] [options]

Commands:
  studio                 Serve Studio/API and open the secure local entry (default).
  serve                  Serve the API only.
  list                   List saved simulations for the project.
  results <id>           Inspect exploration results (findings, observations, investigations).

Options:
  --project <directory>  Target project (default: current directory).
  --port <number>        Loopback port, 0 selects an available port (default: 0).
  --data-directory <dir> Storage directory, relative to the target project.
  --no-open             Print the Studio entry without opening a browser.
  --no-studio           Legacy alias for serve.
  -h, --help            Show help without starting the host.
  -v, --version         Show the package version without starting the host.

Flags override OFFSCRIPT_PROJECT_ROOT, OFFSCRIPT_PORT, OFFSCRIPT_DATA_DIRECTORY.
No agents or target services start automatically.`);
  } else if (values.version) {
    console.log(JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version);
  } else {
    const project = values.project ?? process.env.OFFSCRIPT_PROJECT_ROOT ?? process.cwd();
    try {
      if (!project.trim() || !statSync(project).isDirectory()) throw new Error();
    } catch { throw new Error("Project must reference an existing, accessible directory."); }
    const dataDirectory = values["data-directory"] ?? process.env.OFFSCRIPT_DATA_DIRECTORY;
    if (dataDirectory !== undefined && !dataDirectory.trim()) throw new Error("Storage directory must not be blank.");

    if (command === "list") {
      const { executeListCommand } = await import(resolveCliScript());
      await executeListCommand({ projectRoot: project, ...(dataDirectory !== undefined ? { dataDirectory } : {}) });
    } else if (isResults) {
      const { executeResultsCommand } = await import(resolveCliScript());
      await executeResultsCommand({ projectRoot: project, simulationId: positionals[1] ?? "", ...(dataDirectory !== undefined ? { dataDirectory } : {}) });
    } else {
      const port = values.port ?? process.env.OFFSCRIPT_PORT ?? "0";
      if (!/^\d+$/.test(port) || !Number.isSafeInteger(Number(port)) || Number(port) > 65535) {
        throw new Error("Port must be an integer between 0 and 65535.");
      }
      const studio = command !== "serve" && !values["no-studio"];
      try {
        if (!statSync(new URL("./dist/scripts/server/run.js", import.meta.url)).isFile()) throw new Error();
        if (studio && !statSync(new URL("./dist/studio/index.html", import.meta.url)).isFile()) throw new Error();
      } catch { throw new Error("Distribution is missing. Run npm run build:local in the OFFSCRIPT checkout, or reinstall the archive."); }
      process.env.OFFSCRIPT_PROJECT_ROOT = project;
      process.env.OFFSCRIPT_PORT = port;
      if (dataDirectory !== undefined) process.env.OFFSCRIPT_DATA_DIRECTORY = dataDirectory;
      if (studio) process.env.OFFSCRIPT_STUDIO_DIRECTORY = fileURLToPath(new URL("./dist/studio/", import.meta.url));
      else delete process.env.OFFSCRIPT_STUDIO_DIRECTORY;
      process.env.OFFSCRIPT_OPEN_BROWSER = studio && !values["no-open"] ? "1" : "0";
      await import("./dist/scripts/server/run.js");
    }
  }
} catch (error) {
  console.error(`OFFSCRIPT: ${error instanceof Error ? error.message : "Could not launch. Use --help for usage."}`);
  process.exitCode = 1;
}
