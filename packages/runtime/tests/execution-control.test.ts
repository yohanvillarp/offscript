import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId, transitionSimulation } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { createControlledDemoSessionFactory } from "../../orchestration/index.ts";
import { ApplicationError } from "../../application/index.ts";
import { eventually, hostContext } from "./host-context.ts";

const setup = parseSimulationSetup({
  targetUrl: "http://localhost:3000",
  goal: "Verify the simulated cart retains items.",
  userProfileIds: ["explorer", "impatient"],
  environment: { kind: "web", deployment: "local" },
  limits: { maxTurnsPerAgent: 3, maxInferenceCallsPerTurn: 12, inferenceTimeoutMs: 15_000, durationMs: 30_000 },
});

test("host starts and inspects controlled demo execution against the cart fixture", async (t) => {
  process.env.MOZAIK_API_KEY = "";
  const temp = hostContext(t);
  const host = temp.host({ sessionFactory: createControlledDemoSessionFactory() });
  await host.start();

  const id = simulationId("sim-run");
  await host.configureSimulation({ simulationId: id, setup });

  // Before start: inspect reports idle
  const idle = await host.inspectExecution(id);
  assert.equal(idle.phase, "idle");
  assert.equal(idle.turnsCount, 0);

  // Start execution
  const started = await host.startSimulation(id, "controlled-demo");
  assert.equal(started.phase, "running");
  assert.equal(started.mode, "controlled-demo");
  assert.deepEqual(started.activeAgents, ["explorer", "impatient"]);

  // Duplicate start rejected
  await assert.rejects(
    host.startSimulation(id, "controlled-demo"),
    (err: unknown) => err instanceof ApplicationError && err.code === "EXECUTION_ALREADY_ACTIVE",
  );

  // Deletion blocked while active
  assert.equal(await host.deleteConfiguration(id), "not-allowed");

  // Inspect reflects running session and active agents
  await eventually(async () => {
    const inspected = await host.inspectExecution(id);
    return inspected.phase === "running" && inspected.turnsCount >= 1;
  });

  // Stop simulation
  const stopped = await host.stopSimulation(id);
  assert.equal(stopped.phase, "cancelled");

  // Inspect confirms cancelled
  const inspectedAfterStop = await host.inspectExecution(id);
  assert.equal(inspectedAfterStop.phase, "cancelled");

  // Deletion still blocked because simulation is terminal (not created)
  assert.equal(await host.deleteConfiguration(id), "not-allowed");
});

test("partial startup failure marks simulation as failed and rejects orphan running records", async (t) => {
  const temp = hostContext(t);
  const throwingFactory = () => {
    throw new Error("Simulated runtime startup failure");
  };
  const host = temp.host({ sessionFactory: throwingFactory });
  await host.start();

  const id = simulationId("sim-fail");
  await host.configureSimulation({ simulationId: id, setup });

  await assert.rejects(
    host.startSimulation(id, "controlled-demo"),
    (err: unknown) => err instanceof ApplicationError && err.code === "EXECUTION_START_FAILED",
  );

  // State in storage must be failed with RUNTIME_INITIALIZATION_FAILED, not running
  const inspected = await host.inspectExecution(id);
  assert.equal(inspected.phase, "failed");
  assert.equal(inspected.failureReason, "RUNTIME_INITIALIZATION_FAILED");
});

test("host restart reports persisted running simulations as interrupted without automatic resumption", async (t) => {
  const temp = hostContext(t);
  const host1 = temp.host();
  await host1.start();

  const id = simulationId("sim-orphaned");
  await host1.configureSimulation({ simulationId: id, setup });

  // Manually advance simulation to running in storage to emulate crash during execution
  const storage = (host1 as unknown as { config: { projectRoot: string; dataDirectory: string } });
  const rawDb = temp.open({ dataDirectory: storage.config.dataDirectory });
  rawDb.migrate();
  const current = await rawDb.simulations.findSimulation(id);
  assert.ok(current);
  const runningSim = transitionSimulation(current, { status: "running" });
  await rawDb.simulations.updateSimulationAggregate(runningSim, { status: "created" });
  rawDb.close();

  await host1.close();

  // New host instance starts up
  const host2 = temp.host();
  await host2.start();

  const inspected = await host2.inspectExecution(id);
  assert.equal(inspected.phase, "interrupted");
  assert.equal(inspected.failureReason, "INTERRUPTED_BY_HOST_RESTART");

  // Stop allows operator to mark it cancelled
  const stopped = await host2.stopSimulation(id);
  assert.equal(stopped.phase, "cancelled");
});

test("budget duration expiry transitions simulation to cancelled", async (t) => {
  process.env.MOZAIK_API_KEY = "";
  const temp = hostContext(t);
  const host = temp.host({ sessionFactory: createControlledDemoSessionFactory() });
  await host.start();

  const fastSetup = parseSimulationSetup({
    ...setup,
    limits: { maxTurnsPerAgent: 3, maxInferenceCallsPerTurn: 12, inferenceTimeoutMs: 50, durationMs: 100 },
  });
  const id = simulationId("sim-timeout");
  await host.configureSimulation({ simulationId: id, setup: fastSetup });

  await host.startSimulation(id, "controlled-demo");

  await eventually(async () => {
    const inspected = await host.inspectExecution(id);
    return inspected.phase === "cancelled" && inspected.failureReason === "SESSION_BUDGET_EXHAUSTED";
  });
});
