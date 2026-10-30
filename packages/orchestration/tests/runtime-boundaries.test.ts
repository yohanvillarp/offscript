import assert from "node:assert/strict";
import { test } from "node:test";
import { FunctionCallItem, ModelMessageItem } from "@mozaik-ai/core";
import type { InferenceOutput, InferenceRunner } from "@mozaik-ai/core";
import { createExplorationSession } from "../index.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";

function runner(run: InferenceRunner["run"]): InferenceRunner {
  return { run, async *stream() { yield* []; throw new Error("Not used"); } };
}

function answer(): InferenceOutput {
  return { items: [ModelMessageItem.rehydrate({ text: "Turn finished, not a confirmed finding." })], tokenUsage: undefined, rowResponse: null };
}

for (const kind of ["reject", "empty", "multiple", "unknown-model"] as const) {
  test(`inference ${kind} is reported without an unhandled runLoop rejection`, async (t) => {
    const fixture = scenario();
    const session = createExplorationSession({
      simulation: fixture.simulation, allowedTools: fixture.permissions, model: "unsupported-test-model",
      ...(kind === "unknown-model" ? {} : { runner: runner(async () => {
        if (kind === "reject") throw new Error("Inference rejected");
        return { ...answer(), items: kind === "empty" ? [] : [...answer().items, ...answer().items] };
      }) }),
    });
    t.after(() => session.close());
    session.startTurn(fixture.beginner, "Explore");
    const result = await session.waitForIdle();
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0]?.stage, "inference");
    assert.equal(result.observations.length, 0);
    assert.equal(result.simulation.lifecycle.status, "running");
  });
}

test("inference budget ends a turn requesting endless function calls", async (t) => {
  const fixture = scenario();
  const session = createExplorationSession({
    simulation: fixture.simulation, allowedTools: fixture.permissions, model: "fixture", maxInferenceCallsPerTurn: 2,
    runner: runner(async () => ({ ...answer(), items: [FunctionCallItem.rehydrate({
      callId: crypto.randomUUID(), name: "inspect_application", args: JSON.stringify({ phase: "before_reload" }),
    })] })),
  });
  t.after(() => session.close());
  session.startTurn(fixture.beginner, "Explore");
  const result = await session.waitForIdle();
  assert.equal(result.failures[0]?.stage, "inference-budget");
});

test("inference deadline ignores a late provider result without claiming provider cancellation", async (t) => {
  const fixture = scenario();
  let finish: ((value: InferenceOutput) => void) | undefined;
  const session = createExplorationSession({
    simulation: fixture.simulation, allowedTools: fixture.permissions, model: "fixture", inferenceTimeoutMs: 5,
    runner: runner(() => new Promise<InferenceOutput>((resolve) => { finish = resolve; })),
  });
  t.after(() => session.close());
  session.startTurn(fixture.beginner, "Explore");
  const result = await session.waitForIdle();
  assert.equal(result.failures[0]?.stage, "inference");
  finish?.({ ...answer(), items: [FunctionCallItem.rehydrate({
    callId: "late", name: "record_observation", args: JSON.stringify({ description: "Late observation", location: "/cart" }),
  })] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.snapshot().observations.length, 0);
});

test("settlement timeout closes admission while in-flight inference remains separately bounded", async (t) => {
  const fixture = scenario();
  const session = createExplorationSession({
    simulation: fixture.simulation, allowedTools: fixture.permissions, model: "fixture", inferenceTimeoutMs: 15,
    runner: runner(() => new Promise<InferenceOutput>(() => {})),
  });
  t.after(() => session.close());
  session.startTurn(fixture.beginner, "Explore");
  await assert.rejects(session.waitForIdle(5), /not guaranteed cancelled/);
  assert.equal(session.snapshot().closed, true);
  await new Promise((resolve) => setTimeout(resolve, 20));
});

test("sharing a supplied inference runner does not mutate it or mix per-session guards", async (t) => {
  const shared = runner(async () => answer());
  const original = shared.run;
  const fixture = scenario();
  const first = createExplorationSession({ simulation: fixture.simulation, allowedTools: fixture.permissions, model: "fixture", runner: shared });
  const second = createExplorationSession({ simulation: fixture.simulation, allowedTools: fixture.permissions, model: "fixture", runner: shared });
  t.after(() => { first.close(); second.close(); });
  first.startTurn(fixture.beginner, "Explore");
  second.startTurn(fixture.beginner, "Explore");
  const results = await Promise.all([first.waitForIdle(), second.waitForIdle()]);
  assert.equal(shared.run, original);
  assert.ok(results.every((result) => result.failures.length === 0));
});
