import { transitionSimulation, updateSimulationAgent } from "../domain/index.ts";
import type { Simulation, SimulationId } from "../domain/index.ts";
import type { HostStorage } from "./host-storage.ts";

export type SettlementOutcome = "completed" | "cancelled" | "failed";

export type SettlementResult =
  | { readonly settled: true; readonly outcome: SettlementOutcome; readonly simulation: Simulation }
  | { readonly settled: false; readonly reason: "conflict" | "not-found" | "not-running" | "storage-error"; readonly error?: unknown };

export async function settleSimulationAggregate(
  storage: HostStorage,
  id: SimulationId,
  outcome: SettlementOutcome,
  reason?: string,
): Promise<SettlementResult> {
  try {
    const currentSim = await storage.simulations.findSimulation(id);
    if (!currentSim) return { settled: false, reason: "not-found" };
    if (currentSim.lifecycle.status !== "running") return { settled: false, reason: "not-running" };

    let targetSim: Simulation;
    if (outcome === "completed") {
      let updatedSim = currentSim;
      for (const agent of currentSim.agents) {
        if (agent.lifecycle.status === "running") {
          updatedSim = updateSimulationAgent(updatedSim, agent.id, { status: "completed" });
        } else if (agent.lifecycle.status === "ready") {
          updatedSim = updateSimulationAgent(updatedSim, agent.id, { status: "cancelled" });
        }
      }
      targetSim = transitionSimulation(updatedSim, { status: "completed" });
    } else if (outcome === "cancelled") {
      targetSim = transitionSimulation(currentSim, { status: "cancelled" });
    } else {
      targetSim = transitionSimulation(currentSim, {
        status: "failed",
        reason: reason ?? "EXECUTION_FAILED",
      });
    }

    const commit = await storage.simulations.updateSimulationAggregate(targetSim, { status: "running" });
    if (commit === "conflict" || commit === "not-found") {
      return { settled: false, reason: commit };
    }
    return { settled: true, outcome, simulation: targetSim };
  } catch (error) {
    return { settled: false, reason: "storage-error", error };
  }
}

export function inspectExecutionFailures(snapshot: unknown): { hasFailures: boolean; reason?: string } {
  if (!snapshot || typeof snapshot !== "object") return { hasFailures: false };
  const failures = (snapshot as { failures?: readonly { stage?: string; cause?: unknown }[] }).failures;
  if (!Array.isArray(failures) || failures.length === 0) return { hasFailures: false };
  const first = failures[0];
  const stage = first?.stage ? `_${first.stage.toUpperCase().replace(/[^A-Z0-9]/g, "_")}` : "";
  return { hasFailures: true, reason: `SESSION_EXECUTION_FAILED${stage}` };
}
