import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { agentId, simulationId } from "../../domain/index.ts";
import { configuredSimulation } from "../../application/index.ts";
import { createBrowserExplorationSessionFactory } from "../browser-exploration-factory.ts";
import { deterministicBrowserRunner } from "../deterministic-browser-runner.ts";
import { startTestServer } from "../../browser/tests/test-server.ts";
import { eventually, hostContext } from "../../runtime/tests/host-context.ts";
import { observations } from "../../persistence/schema/index.ts";

test("autonomous browser exploration executes via local host on a real web application", async (t) => {
  const server = await startTestServer();
  const temp = hostContext(t);
  const db = temp.open();
  db.migrate();
  const rawConn = temp.raw();

  try {
    const simId = simulationId("sim-browser-auto");
    const explorer = agentId("explorer");

    const config = {
      simulationId: simId,
      name: "Auto Browser Exploration",
      projectRoot: temp.root,
      targetUrl: server.origin,
      environment: { kind: "web", deployment: "test" } as const,
      goal: "Explore the demo shop",
      userProfileIds: ["explorer"] as const,
      limits: {
        maxTurnsPerAgent: 2,
        maxInferenceCallsPerTurn: 5,
        inferenceTimeoutMs: 5_000,
        durationMs: 15_000,
      },
    };
    const sim = configuredSimulation(config as any);
    await db.configurations.createConfiguredSimulation(config, sim);

    const factory = createBrowserExplorationSessionFactory({
      defaultTargetUrl: server.origin,
      headless: true,
      runner: deterministicBrowserRunner(),
    });

    const host = temp.host({ sessionFactory: factory });
    await host.start();

    // Start browser exploration
    const status = await host.startSimulation(simId, "browser-exploration");
    assert.equal(status.phase, "running");
    assert.equal(status.mode, "browser-exploration");

    // Wait until turn has completed and observation is saved in SQLite
    await eventually(async () => {
      const rows = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
      return rows.length >= 1;
    });

    const rows = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
    assert.ok(rows.length >= 1);
    const firstRow = rows[0]!;
    assert.equal(firstRow.simulationId, simId);
    assert.equal(firstRow.agentId, explorer);
    assert.equal(firstRow.location, server.origin + "/");

    // Inspect execution status
    const exec = await host.inspectExecution(simId);
    assert.equal(exec.simulationId, simId);
    assert.equal(exec.mode, "browser-exploration");
    assert.ok(exec.turnsCount >= 1);
    assert.ok(exec.recentActivity && exec.recentActivity.length > 0);
    assert.equal(exec.recentActivity[0]?.agentId, explorer);

    // Verify visual evidence was captured and stored
    const parsedEvidenceIds = JSON.parse(firstRow.evidenceIds) as string[];
    const firstEvId = parsedEvidenceIds[0];
    assert.ok(firstEvId);
    const evidence = await host.getEvidence(simId, firstEvId);
    assert.ok(evidence);
    assert.equal(evidence.contentType, "image/png");

    // Stop execution cleanly
    const stopResult = await host.stopSimulation(simId);
    assert.ok(stopResult.phase === "cancelled" || stopResult.phase === "completed");

    await host.close();
  } finally {
    await server.close();
  }
});

test("record_observation failure injection does not create ghost evidence and binds real location", async () => {
  const { browserExplorationTools } = await import("../tools/browser-exploration-tools.ts");
  const { ExplorationState } = await import("../state.ts");
  const { simulationId, agentId } = await import("../../domain/index.ts");

  const simId = simulationId("sim-evidence-fail-injection");
  const agId = agentId("tester");
  const state = new ExplorationState({
    id: simId,
    agents: [{ id: agId, profile: { name: "Explorer", personality: "active", goals: [] } }],
  } as any);
  state.permissions.set(agId, new Set(["record_observation"]));

  const mockBrowserSession = {
    getCurrentUrl: () => "http://127.0.0.1:8080/actual-page",
    screenshot: async () => ({ success: false, error: "INJECTED_CAPTURE_FAILURE" }),
  } as any;

  const mockStorage = {
    observations: {
      async createObservation() { return "created" as const; },
    },
  } as any;

  const published: any[] = [];
  const tools = browserExplorationTools(
    state,
    agId,
    mockBrowserSession,
    (event) => published.push(event),
    mockStorage,
    { saveEvidence: async () => {} } as any,
  );

  const recordTool = tools.find((t) => t.name === "record_observation");
  assert.ok(recordTool);

  const res = (await recordTool.invoke({
    description: "Observed issue while screenshot capture fails",
    location: "/untrusted-location",
  })) as { observationId: string; evidenceId: string };

  assert.ok(res.observationId);
  assert.equal(res.evidenceId, "");

  const saved = state.observations.get(res.observationId as any);
  assert.ok(saved);
  assert.equal(saved.context.location, "http://127.0.0.1:8080/actual-page");
  assert.deepEqual(saved.evidenceIds, []);
});

test("browser exploration initializes instructions and executes with expanded behavioral profiles", async (t) => {
  const server = await startTestServer();
  const temp = hostContext(t);
  const db = temp.open();
  db.migrate();
  const rawConn = temp.raw();

  try {
    const simId = simulationId("sim-browser-multi-profiles");
    const config = {
      simulationId: simId,
      name: "Meticulous & Distrustful Exploration",
      projectRoot: temp.root,
      targetUrl: server.origin,
      environment: { kind: "web", deployment: "test" } as const,
      goal: "Check payment and form security",
      userProfileIds: ["meticulous", "distrustful"] as const,
      limits: {
        maxTurnsPerAgent: 1,
        maxInferenceCallsPerTurn: 4,
        inferenceTimeoutMs: 5_000,
        durationMs: 15_000,
      },
    };
    const sim = configuredSimulation(config as any);
    await db.configurations.createConfiguredSimulation(config, sim);

    const factory = createBrowserExplorationSessionFactory({
      defaultTargetUrl: server.origin,
      headless: true,
      runner: deterministicBrowserRunner(),
    });

    const host = temp.host({ sessionFactory: factory });
    await host.start();

    const status = await host.startSimulation(simId, "browser-exploration");
    assert.equal(status.phase, "running");

    await eventually(async () => {
      const rows = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
      return rows.length >= 1;
    });

    const rows = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
    assert.ok(rows.length >= 1);

    const stopResult = await host.stopSimulation(simId);
    assert.ok(stopResult.phase === "cancelled" || stopResult.phase === "completed");

    await host.close();
  } finally {
    await server.close();
  }
});
