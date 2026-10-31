import { and, eq } from "drizzle-orm";
import type { AgentId, AgentLifecycle, Simulation, SimulationLifecycle } from "../../domain/index.ts";
import type { PersistenceDatabase } from "../connection.ts";
import { agents, simulations } from "../schema/index.ts";
import { simulationRows } from "../codecs/simulation.ts";

type WriteDatabase = Pick<PersistenceDatabase, "select" | "insert" | "update" | "delete">;

export function writeSimulation(tx: Pick<PersistenceDatabase, "insert">, simulation: Simulation): "created" | "already-exists" {
  const { row, members } = simulationRows(simulation);
  const created = tx.insert(simulations).values(row).onConflictDoNothing({ target: simulations.id }).run();
  if (!created.changes) return "already-exists";
  if (members.length) tx.insert(agents).values(members).run();
  return "created";
}

export type ExpectedSimulationAggregate = Readonly<{
  status: SimulationLifecycle["status"];
  agentStatuses?: ReadonlyMap<AgentId, AgentLifecycle["status"]>;
}>;

export function updateSimulationAggregate(
  tx: WriteDatabase,
  simulation: Simulation,
  expected: ExpectedSimulationAggregate,
): "updated" | "conflict" | "not-found" {
  const current = tx.select().from(simulations).where(eq(simulations.id, simulation.id)).get();
  if (!current) return "not-found";
  if (current.status !== expected.status) return "conflict";
  const members = tx.select().from(agents).where(eq(agents.simulationId, simulation.id)).all();
  if (expected.agentStatuses) {
    for (const [agentId, expectedStatus] of expected.agentStatuses) {
      const member = members.find((entry) => entry.id === agentId);
      if (!member || member.status !== expectedStatus) return "conflict";
    }
  }
  const { row, members: nextMembers } = simulationRows(simulation);
  tx.update(simulations)
    .set({ status: row.status, reason: row.reason })
    .where(eq(simulations.id, simulation.id))
    .run();
  for (const member of nextMembers) {
    tx.update(agents)
      .set({ status: member.status, reason: member.reason })
      .where(and(eq(agents.simulationId, simulation.id), eq(agents.id, member.id)))
      .run();
  }
  return "updated";
}

