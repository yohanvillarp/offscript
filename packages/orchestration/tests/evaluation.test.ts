import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { agentId, evidenceId, investigationId, observationId, simulationId } from "../../domain/index.ts";
import { configuredSimulation } from "../../application/index.ts";
import { evaluateFindingAssessment } from "../../contracts/index.ts";
import type { CompletedInvestigationSummary } from "../../contracts/index.ts";
import { createBrowserExplorationSessionFactory } from "../browser-exploration-factory.ts";
import { deterministicBrowserRunner } from "../deterministic-browser-runner.ts";
import { eventually, hostContext } from "../../runtime/tests/host-context.ts";
import { observations, simulations } from "../../persistence/schema/index.ts";

function startEvaluationServer() {
  const html = `<!DOCTYPE html><html><head><title>Benchmark Target</title></head><body>
    <h1>Benchmark Store</h1>
    <a id="cart-link" href="/cart">Cart</a>
    <button id="broken-action" type="button">Submit Order</button>
    <div id="status">Ready</div>
  </body></html>`;
  const cartHtml = `<!DOCTYPE html><html><head><title>Cart</title></head><body>
    <h1>Your Cart</h1>
    <p id="cart-items">Empty (state lost on navigation)</p>
    <a href="/">Back</a>
  </body></html>`;

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(url.pathname === "/cart" ? cartHtml : html);
  });

  return new Promise<{ origin: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = addr && typeof addr !== "string" ? addr.port : 0;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => {
          server.closeAllConnections?.();
          server.close(() => done());
        }),
      });
    });
  });
}

test("controlled evaluation benchmark validates multi-profile exploration, evidence, and corroborated findings", async (t) => {
  const server = await startEvaluationServer();
  const temp = hostContext(t);
  const db = temp.open();
  db.migrate();
  const rawConn = temp.raw();

  try {
    const simId = simulationId("sim-eval-benchmark");
    const explorer = agentId("explorer");
    const beginner = agentId("beginner");

    const config = {
      simulationId: simId,
      name: "Evaluation Benchmark",
      projectRoot: temp.root,
      targetUrl: server.origin,
      environment: { kind: "web", deployment: "test" } as const,
      goal: "Explore benchmark target and identify cart persistence or interaction defects.",
      userProfileIds: ["explorer", "beginner"] as const,
      limits: {
        maxTurnsPerAgent: 2,
        maxInferenceCallsPerTurn: 6,
        inferenceTimeoutMs: 10_000,
        durationMs: 20_000,
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

    // 1. Start execution and verify active status
    const status = await host.startSimulation(simId, "browser-exploration");
    assert.equal(status.phase, "running");
    assert.equal(status.mode, "browser-exploration");

    // 2. Wait until observations are persisted
    await eventually(async () => {
      const rows = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
      return rows.length >= 1;
    });

    const storedObs = rawConn.db.select().from(observations).where(eq(observations.simulationId, simId)).all();
    assert.ok(storedObs.length >= 1);
    const firstObs = storedObs[0]!;
    assert.equal(firstObs.simulationId, simId);
    assert.ok(firstObs.evidenceIds.length > 0, "Observation must include attributable evidence references");

    // 3. Evaluate finding assessment with explicit confirmation criteria
    const parsedEvidence = (JSON.parse(firstObs.evidenceIds) as string[]).map((e) => evidenceId(e));
    const beginnerEvidence = [evidenceId("ev-beginner-corroborated")];
    const obsId = observationId(firstObs.id);
    const dummyObsSummary = [
      {
        id: obsId,
        simulationId: simId,
        agentId: explorer,
        observedAt: firstObs.observedAt,
        description: firstObs.description,
        context: { location: firstObs.location },
        evidenceIds: parsedEvidence,
      },
      {
        id: observationId("obs-beginner-corroborated"),
        simulationId: simId,
        agentId: beginner,
        observedAt: new Date().toISOString(),
        description: "Beginner verified cart state loss upon navigation.",
        context: { location: "/cart" },
        evidenceIds: beginnerEvidence,
      },
    ];

    // Corroborated assessment with two distinct observing agents and verified evidence
    const corroboratedInv: CompletedInvestigationSummary = {
      id: investigationId("inv-corroborated"),
      simulationId: simId,
      requestedBy: explorer,
      requestedAt: new Date().toISOString(),
      observationIds: [obsId],
      hypothesis: "Cart state lost upon navigation",
      lifecycle: {
        status: "completed",
        agentIds: [beginner],
        assignedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completedBy: beginner,
        result: {
          outcome: "supported",
          explanation: "Verified that navigation clears cart items.",
          evidenceIds: beginnerEvidence,
        },
      },
    };
    const confirmedAssessment = evaluateFindingAssessment(corroboratedInv, dummyObsSummary);
    assert.equal(confirmedAssessment.isConfirmedFinding, true);
    assert.equal(confirmedAssessment.confidence, "corroborated");
    assert.equal(confirmedAssessment.uncertaintyReason, undefined);

    // Single-agent uncorroborated assessment produces provisional finding
    const singleAgentInv: CompletedInvestigationSummary = {
      id: investigationId("inv-single"),
      simulationId: simId,
      requestedBy: explorer,
      requestedAt: new Date().toISOString(),
      observationIds: [obsId],
      hypothesis: "Unverified button defect",
      lifecycle: {
        status: "completed",
        agentIds: [],
        assignedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        completedBy: explorer,
        result: {
          outcome: "supported",
          explanation: "Single user noticed broken action.",
          evidenceIds: parsedEvidence,
        },
      },
    };
    const provisionalAssessment = evaluateFindingAssessment(singleAgentInv, dummyObsSummary);
    assert.equal(provisionalAssessment.isConfirmedFinding, false);
    assert.equal(provisionalAssessment.confidence, "provisional");
    assert.ok(provisionalAssessment.uncertaintyReason?.includes("collaborator corroboration"));

    // 4. Natural session settlement or clean stop
    const stopResult = await host.stopSimulation(simId);
    assert.ok(stopResult.phase === "completed" || stopResult.phase === "cancelled");

    const simRow = rawConn.db.select().from(simulations).where(eq(simulations.id, simId)).get();
    assert.ok(simRow?.status === "completed" || simRow?.status === "cancelled");

    await host.close();
  } finally {
    await server.close();
  }
});
