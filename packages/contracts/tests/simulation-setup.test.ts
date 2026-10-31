import assert from "node:assert/strict";
import { test } from "node:test";
import { ContractValidationError, defaultExecutionLimits, parseSimulationSetup } from "../index.ts";
import { parseProjectDescriptor, parseTargetConnection } from "../index.ts";

const setup = { targetUrl: "http://localhost:3000", environment: { kind: "web", deployment: "local" },
  goal: "Find a product and complete a purchase.", userProfileIds: ["explorer", "beginner"] };

test("setup proposes bounded defaults and preserves a concrete multiline goal", () => {
  const parsed = parseSimulationSetup({ ...setup, goal: "  Find a product.\nComplete a purchase.  " });
  assert.deepEqual(parsed.limits, defaultExecutionLimits);
  assert.equal(parsed.targetUrl, "http://localhost:3000/");
  assert.equal(parsed.goal, "  Find a product.\nComplete a purchase.  ");
});

test("target configuration rejects non-HTTP addresses and embedded credentials without probing services", () => {
  for (const targetUrl of ["file:///project", "https:example.test", "http://", "https://user:secret@example.test"]) {
    assert.throws(() => parseSimulationSetup({ ...setup, targetUrl }), ContractValidationError);
  }
});

test("selection uses unique behavioral profiles rather than avatar identities", () => {
  for (const userProfileIds of [[], ["explorer", "explorer"], ["raven"]]) {
    assert.throws(() => parseSimulationSetup({ ...setup, userProfileIds }), ContractValidationError);
  }
  assert.deepEqual(parseSimulationSetup({ ...setup, userProfileIds: ["impatient"] }).userProfileIds, ["impatient"]);
  assert.deepEqual(
    parseSimulationSetup({ ...setup, userProfileIds: ["regular", "meticulous", "distrustful"] }).userProfileIds,
    ["regular", "meticulous", "distrustful"],
  );
});

test("execution limits reject unusable budgets and timer values before persistence", () => {
  for (const patch of [{ maxTurnsPerAgent: 0 }, { maxInferenceCallsPerTurn: 101 },
    { durationMs: 2_147_483_648 }, { inferenceTimeoutMs: defaultExecutionLimits.durationMs + 1 }]) {
    assert.throws(() => parseSimulationSetup({ ...setup, limits: { ...defaultExecutionLimits, ...patch } }), ContractValidationError);
  }
});

test("project suggestions and connection results validate their public transport shapes", () => {
  const targetSuggestion = { url: "http://localhost:5173", source: "vite-default", scriptName: "dev" };
  const project = parseProjectDescriptor({ rootPath: "/project", suggestedName: "App", nameSource: "directory", targetSuggestion });
  assert.equal(project.targetSuggestion?.url, "http://localhost:5173/");
  assert.deepEqual(parseTargetConnection({ url: "http://localhost:5173", kind: "response", statusCode: 503 }),
    { url: "http://localhost:5173/", kind: "response", statusCode: 503 });
  for (const patch of [{ kind: "unknown" }, { statusCode: 600 }, { url: "https://example.com" }, { extra: true }, { kind: "busy" }]) {
    assert.throws(() => parseTargetConnection({ url: "http://localhost:5173", kind: "response", statusCode: 200, ...patch }), ContractValidationError);
  }
});
