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
  throw new Error("Distribution is missing. Run npm install -g @nikelyh/offscript, or run npm run build:local in the source repository.");
}

const commandHelps = {
  studio: `Usage: offscript studio [options]

Serve the local OFFSCRIPT Studio UI and API, and open the secure local entry in your default browser.

Options:
  --project <directory>  Target project path (default: current working directory).
  --port <number>        Loopback port to bind (default: 0 for automatic port selection).
  --data-directory <dir> Storage directory relative to target project (default: .offscript).
  --no-open             Print the authenticated entry URL without launching a browser.`,

  serve: `Usage: offscript serve [options]

Serve the headless local OFFSCRIPT API host without launching the Studio web UI.

Options:
  --project <directory>  Target project path (default: current working directory).
  --port <number>        Loopback port to bind (default: 0 for automatic port selection).
  --data-directory <dir> Storage directory relative to target project (default: .offscript).`,

  list: `Usage: offscript list [options]

List all saved simulations, configurations, and their current execution statuses in the target project.

Options:
  --project <directory>  Target project path (default: current working directory).
  --data-directory <dir> Storage directory relative to target project (default: .offscript).`,

  results: `Usage: offscript results <simulation-id> [options]

Inspect attributed observations, collaborative investigations, finding assessments, and visual evidence.

Arguments:
  <simulation-id>        Unique identifier of the simulation to inspect.

Options:
  --project <directory>  Target project path (default: current working directory).
  --data-directory <dir> Storage directory relative to target project (default: .offscript).`,

  recover: `Usage: offscript recover <simulation-id> [options]

Explicitly settle an interrupted or abandoned simulation to 'failed' (or 'cancelled' with --cancel).

Arguments:
  <simulation-id>        Unique identifier of the simulation to settle.

Options:
  --project <directory>  Target project path (default: current working directory).
  --data-directory <dir> Storage directory relative to target project (default: .offscript).
  --cancel               Mark simulation status as 'cancelled' instead of 'failed'.`,
};

const generalHelp = `Usage: offscript [command] [options]

Commands:
  studio                 Serve Studio/API and open the secure local entry (default).
  serve                  Serve the API only.
  list                   List saved simulations for the project.
  results <id>           Inspect exploration results (findings, observations, investigations).
  recover <id>           Explicitly settle an interrupted simulation to failed (or cancelled with --cancel).
  help [command]         Show help information for a command.

Options:
  --project <directory>  Target project (default: current directory).
  --port <number>        Loopback port, 0 selects an available port (default: 0).
  --data-directory <dir> Storage directory, relative to the target project.
  --cancel               When recovering, mark as cancelled instead of failed.
  --no-open             Print the Studio entry without opening a browser.
  --no-studio           Legacy alias for serve.
  -h, --help            Show help without starting the host.
  -v, --version         Show the package version without starting the host.

Examples:
  offscript studio                      Start Studio in the current project
  offscript studio --project ./my-app   Start Studio for a specific project
  offscript list                        List all simulations in the project
  offscript results sim-123             Inspect observations and findings
  offscript help studio                 Show detailed help for the studio command

Flags override OFFSCRIPT_PROJECT_ROOT, OFFSCRIPT_PORT, OFFSCRIPT_DATA_DIRECTORY.
No agents or target services start automatically.`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    project: { type: "string" }, port: { type: "string" }, "data-directory": { type: "string" },
    "no-studio": { type: "boolean" }, "no-open": { type: "boolean" }, cancel: { type: "boolean" },
    help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" },
  } });
  const command = positionals[0];
  const isHelp = command === "help" || Boolean(values.help);
  const helpTarget = command === "help" ? positionals[1] : undefined;
  const isResults = command === "results";
  const isRecover = command === "recover";
  const isTargeted = isResults || isRecover;
  const validCommands = ["studio", "serve", "list", "results", "recover", "help"];
  if (
    (command !== undefined && !validCommands.includes(command)) ||
    (isTargeted && positionals.length !== 2) ||
    (!isTargeted && command !== "help" && positionals.length > 1) ||
    (command === "help" && positionals.length > 2)
  ) {
    throw new Error("Expected studio, serve, list, results <simulation-id>, recover <simulation-id>, or help [command]. Use --help for usage.");
  }
  if (!isHelp && ((command === "studio" && values["no-studio"]) ||
      ((command === "serve" || values["no-studio"]) && values["no-open"]) ||
      ((command === "list" || isTargeted) && (values["no-studio"] || values["no-open"] || values.port)))) {
    throw new Error("Conflicting options for command. Use --help for usage.");
  }
  if (isHelp) {
    if (helpTarget) {
      const targetHelp = commandHelps[helpTarget];
      if (targetHelp) {
        console.log(targetHelp);
      } else {
        throw new Error(`Unknown command "${helpTarget}". Expected studio, serve, list, results, or recover.`);
      }
    } else {
      console.log(generalHelp);
    }
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
    } else if (isRecover) {
      const { executeRecoverCommand } = await import(resolveCliScript());
      await executeRecoverCommand({ projectRoot: project, simulationId: positionals[1] ?? "", cancel: Boolean(values.cancel), ...(dataDirectory !== undefined ? { dataDirectory } : {}) });
    } else {
      const port = values.port ?? process.env.OFFSCRIPT_PORT ?? "0";
      if (!/^\d+$/.test(port) || !Number.isSafeInteger(Number(port)) || Number(port) > 65535) {
        throw new Error("Port must be an integer between 0 and 65535.");
      }
      const studio = command !== "serve" && !values["no-studio"];
      try {
        if (!statSync(new URL("./dist/scripts/server/run.js", import.meta.url)).isFile()) throw new Error();
        if (studio && !statSync(new URL("./dist/studio/index.html", import.meta.url)).isFile()) throw new Error();
      } catch { throw new Error("Distribution is missing. Run npm install -g @nikelyh/offscript, or run npm run build:local in the source repository."); }
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
