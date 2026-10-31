import { transitionSimulation, updateSimulationAgent } from "../domain/index.ts";
import type { SimulationId } from "../domain/index.ts";
import type { HostStorage } from "./host-storage.ts";

export type SettlementOutcome = "completed" | "cancelled" | "failed";

export async function settleSimulationAggregate(
  storage: HostStorage,
  id: SimulationId,
  outcome: SettlementOutcome,
  reason?: string,
): Promise<void> {
  try {
    const currentSim = await storage.simulations.findSimulation(id);
    if (!currentSim || currentSim.lifecycle.status !== "running") return;

    if (outcome === "completed") {
      let updatedSim = currentSim;
      for (const agent of currentSim.agents) {
        if (agent.lifecycle.status === "running") {
          updatedSim = updateSimulationAgent(updatedSim, agent.id, { status: "completed" });
        } else if (agent.lifecycle.status === "ready") {
          updatedSim = updateSimulationAgent(updatedSim, agent.id, { status: "cancelled" });
        }
      }
      const completedSim = transitionSimulation(updatedSim, { status: "completed" });
      await storage.simulations.updateSimulationAggregate(completedSim, { status: "running" });
    } else if (outcome === "cancelled") {
      const cancelledSim = transitionSimulation(currentSim, { status: "cancelled" });
      await storage.simulations.updateSimulationAggregate(cancelledSim, { status: "running" });
    } else if (outcome === "failed") {
      const failedSim = transitionSimulation(currentSim, {
        status: "failed",
        reason: reason ?? "EXECUTION_FAILED",
      });
      await storage.simulations.updateSimulationAggregate(failedSim, { status: "running" });
    }
  } catch {
    // Best-effort aggregate settlement; background errors do not crash host
  }
}
