import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { TestContext } from "node:test";
import {
  agentId, createAgent, createAgentProfile, createObservation, createSimulation, evidenceId,
  investigationId, observationId, requestInvestigation, simulationId, transitionSimulation, updateSimulationAgent,
} from "../../domain/index.ts";
import { openPersistence } from "../index.ts";
import { openConnection } from "../connection.ts";
import type { PersistenceOptions } from "../connection.ts";

export function fixture(name = "simulation-one") {
  const profile = createAgentProfile({
    name: "Curious user", personality: "Explores unfamiliar paths", goals: [{ description: "Understand the cart" }], capabilities: ["web.inspect"],
  });
  const ready = createSimulation(simulationId(name), { kind: "web", deployment: "test" }, [
    createAgent(agentId("explorer"), profile), createAgent(agentId("beginner"), profile),
  ]);
  let simulation = transitionSimulation(ready, { status: "running" });
  for (const agent of ready.agents) simulation = updateSimulationAgent(simulation, agent.id, { status: "running" });
  const observation = createObservation({
    id: observationId(`observation-${name}`), simulationId: simulation.id, agentId: agentId("beginner"),
    observedAt: "2026-10-30T12:00:00.000Z", description: "  Cart changed after reload.\nCheck persistence.  ",
    context: { location: "/cart?locale=es" }, evidenceIds: [evidenceId("opaque-capture-reference")],
  });
  const investigation = requestInvestigation({
    id: investigationId(`investigation-${name}`), simulationId: simulation.id, requestedBy: agentId("explorer"),
    hypothesis: "Cart changes might not persist.", requestedAt: observation.observedAt,
  }, [observation]);
  return { ready, simulation, observation, investigation };
}

export function storage(t: TestContext) {
  const parent = resolve(tmpdir());
  const root = mkdtempSync(join(parent, "offscript-persistence-"));
  const handles: { close: () => void }[] = [];
  t.after(() => {
    for (const handle of handles) handle.close();
    if (dirname(resolve(root)) !== parent || !basename(root).startsWith("offscript-persistence-")) throw new Error("Unexpected cleanup target.");
    rmSync(root, { recursive: true, force: true });
  });
  function open(options: Partial<PersistenceOptions> = {}) {
    const value = openPersistence({ projectRoot: root, ...options });
    handles.push(value);
    return value;
  }
  function raw(options: Partial<PersistenceOptions> = {}) {
    const value = openConnection({ projectRoot: root, ...options });
    handles.push({ close() { if (value.client.open) value.client.close(); } });
    return value;
  }
  return { root, open, raw };
}

export async function seed(handle: ReturnType<typeof openPersistence>, value = fixture()) {
  await handle.simulations.createSimulation(value.simulation);
  await handle.observations.createObservation(value.observation);
  await handle.investigations.createInvestigation(value.investigation);
  return value;
}

export function sqliteCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return "cause" in error ? sqliteCode(error.cause) : undefined;
}
