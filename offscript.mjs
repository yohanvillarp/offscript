#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

try {
  const { values } = parseArgs({ options: {
    project: { type: "string" }, port: { type: "string" }, "data-directory": { type: "string" },
    "no-studio": { type: "boolean" }, help: { type: "boolean", short: "h" },
  } });
  if (values.help) {
    console.log("Usage: offscript [--project <directory>] [--port <number>] [--data-directory <directory>] [--no-studio]");
    console.log("Starts the local configuration Studio. Default project: current directory. No agents or target services are started.");
  } else {
    if (values.project !== undefined) process.env.OFFSCRIPT_PROJECT_ROOT = values.project;
    if (values.port !== undefined) process.env.OFFSCRIPT_PORT = values.port;
    if (values["data-directory"] !== undefined) process.env.OFFSCRIPT_DATA_DIRECTORY = values["data-directory"];
    if (!values["no-studio"]) process.env.OFFSCRIPT_STUDIO_DIRECTORY = fileURLToPath(new URL("./dist/studio/", import.meta.url));
    else delete process.env.OFFSCRIPT_STUDIO_DIRECTORY;
    await import("./dist/scripts/server/run.js");
  }
} catch {
  console.error("Could not launch OFFSCRIPT. Run npm run build:local in the source checkout, or check the command arguments with --help.");
  process.exitCode = 1;
}
