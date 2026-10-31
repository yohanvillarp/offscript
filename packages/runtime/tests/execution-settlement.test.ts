import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId, transitionSimulation } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import type { ExecutionSessionHandle } from "../execution-types.ts";
import { eventually, hostContext } from "./host-context.ts";

const setup = parseSimulationSetup({
  targetUrl: "http://localhost:3000",
  goal: "Verify settlement behavior under failures.",
  userProfileIds: ["explorer", "impatient"],
  environment: { kind: "web", deployment: "local" },
  limits: { maxTurnsPerAgent: 2, maxInferenceCallsPerTurn: 4, inferenceTimeoutMs: 5_000, durationMs: 10_000 },
});

test("injected SQLite storage failure during settlement transitions coordinator to failed", async (t) => {
  const temp = hostContext(t);
  const factory = () => ({
    startTurn: () => true,
    close: async () => {},
    waitForIdle: async () => ({ failures: [] }),
  } as unknown as ExecutionSessionHandle);

  const host = temp.host({ sessionFactory: factory });
  await host.start();

  const id = simulationId("sim-storage-fail");
  await host.configureSimulation({ simulationId: id, setup });
  await host.startSimulation(id, "controlled-demo");

  temp.raw().client.exec(
    "CREATE TRIGGER abort_settle BEFORE UPDATE OF status ON simulations WHEN NEW.status = 'completed' BEGIN SELECT RAISE(ABORT, 'injected settlement failure'); END;",
  );

  await eventually(async () => {
    const inspected = await host.inspectExecution(id);
    return inspected.phase === "failed" && inspected.failureReason === "SETTLEMENT_STORAGE_FAILED";
  });

  const finalStatus = await host.inspectExecution(id);
  assert.equal(finalStatus.phase, "failed");
  assert.equal(finalStatus.failureReason, "SETTLEMENT_STORAGE_FAILED");
  assert.deepEqual(finalStatus.activeAgents, []);
});

test("session close failure prevents reporting clean completion", async (t) => {
  const temp = hostContext(t);
  let closeAttempts = 0;
  const factory = () => ({
    startTurn: () => true,
    close: async () => {
      closeAttempts++;
      if (closeAttempts === 1) {
        throw new Error("Simulated browser context close crash");
      }
    },
    waitForIdle: async () => ({ failures: [] }),
  } as unknown as ExecutionSessionHandle);

  const host = temp.host({ sessionFactory: factory });
  await host.start();

  const id = simulationId("sim-close-fail");
  await host.configureSimulation({ simulationId: id, setup });
  await host.startSimulation(id, "controlled-demo");

  await eventually(async () => {
    const inspected = await host.inspectExecution(id);
    return inspected.phase === "failed" && inspected.failureReason === "SESSION_CLOSE_FAILED";
  });

  const finalStatus = await host.inspectExecution(id);
  assert.equal(finalStatus.phase, "failed");
  assert.equal(finalStatus.failureReason, "SESSION_CLOSE_FAILED");
  assert.deepEqual(finalStatus.activeAgents, []);
});

test("recorded execution failures in session snapshot settle as failed", async (t) => {
  const temp = hostContext(t);
  const factory = () => ({
    startTurn: () => true,
    close: async () => {},
    waitForIdle: async () => ({
      failures: [{ stage: "inference", cause: new Error("Model provider unavailable") }],
    }),
  } as unknown as ExecutionSessionHandle);

  const host = temp.host({ sessionFactory: factory });
  await host.start();

  const id = simulationId("sim-runtime-fail");
  await host.configureSimulation({ simulationId: id, setup });
  await host.startSimulation(id, "controlled-demo");

  await eventually(async () => {
    const inspected = await host.inspectExecution(id);
    return inspected.phase === "failed" && inspected.failureReason === "SESSION_EXECUTION_FAILED_INFERENCE";
  });

  const finalStatus = await host.inspectExecution(id);
  assert.equal(finalStatus.phase, "failed");
  assert.equal(finalStatus.failureReason, "SESSION_EXECUTION_FAILED_INFERENCE");
  assert.deepEqual(finalStatus.activeAgents, []);
});

test("all configured agents receive initial turn invocation on start", async (t) => {
  const temp = hostContext(t);
  const startedAgents: string[] = [];
  const factory = () => ({
    startTurn: (agentId: string) => {
      startedAgents.push(agentId);
      return true;
    },
    close: async () => {},
    waitForIdle: async () => new Promise(() => {}),
  } as unknown as ExecutionSessionHandle);

  const host = temp.host({ sessionFactory: factory });
  await host.start();

  const id = simulationId("sim-all-agents");
  await host.configureSimulation({ simulationId: id, setup });
  await host.startSimulation(id, "controlled-demo");

  assert.deepEqual(startedAgents.sort(), ["explorer", "impatient"].sort());
  await host.stopSimulation(id);
});

test("restored simulation inspection does not invent prior mode or active agents", async (t) => {
  const temp = hostContext(t);
  const host1 = temp.host();
  await host1.start();

  const id = simulationId("sim-restored");
  await host1.configureSimulation({ simulationId: id, setup });

  const rawDb = temp.open();
  rawDb.migrate();
  const current = await rawDb.simulations.findSimulation(id);
  assert.ok(current);
  await rawDb.simulations.updateSimulationAggregate(
    transitionSimulation(current, { status: "running" }),
    { status: "created" },
  );
  rawDb.close();

  await host1.close();

  const host2 = temp.host();
  await host2.start();

  const inspected = await host2.inspectExecution(id);
  assert.equal(inspected.phase, "interrupted");
  assert.equal(inspected.failureReason, "INTERRUPTED_BY_HOST_RESTART");
  assert.equal(inspected.mode, undefined);
  assert.deepEqual(inspected.activeAgents, []);
  assert.equal(inspected.recentActivity, undefined);
});
