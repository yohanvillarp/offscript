import { supportedModels } from "@mozaik-ai/core";
import { createExplorationSession } from "../../packages/orchestration/index.ts";
import { deterministicRunner } from "./deterministic-runner.ts";
import { scenario } from "./scenario.ts";

try { process.loadEnvFile(); } catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
// Entry-point scoped opt-out overrides .env and cached cloud credentials.
process.env.MOZAIK_API_KEY = "";
const live = process.argv.includes("--live");
const model = live ? process.env.OFFSCRIPT_MODEL : "offscript-deterministic";
if (!model || (live && !supportedModels.some((entry) => entry.specification.name === model))) {
  throw new Error("Set OFFSCRIPT_MODEL to a model supported by installed Mozaik. Credentials must be supplied through its provider environment.");
}
const fixture = scenario();
const session = createExplorationSession({
  simulation: fixture.simulation, model, allowedTools: fixture.permissions,
  ...(!live ? { runner: deterministicRunner() } : {}), durationMs: 60_000,
  inferenceTimeoutMs: live ? 30_000 : 5_000,
  onEvent(event) { console.log(`[${event.type}] simulation=${event.simulationId} correlation=${event.correlationId}`); },
});
try {
  console.log(live ? "Live model inference against a simulated local cart." : "Deterministic inference fixture on the real Mozaik runtime; no model API requests.");
  session.startTurn(fixture.beginner, "Explore the simulated cart, compare before and after reload, and request an investigation if useful.");
  session.startTurn(fixture.explorer, "Explore the simulated cart independently and contribute to peer investigations when requested.");
  const result = await session.waitForIdle();
  console.log(JSON.stringify({
    model, observations: result.observations.length, investigations: result.investigations.length,
    turns: result.turns, failures: result.failures.map((failure) => ({ stage: failure.stage, agentId: failure.agentId })),
    simulationStatus: result.simulation.lifecycle.status,
  }, null, 2));
  if (result.failures.length) process.exitCode = 1;
} finally { session.close(); }
