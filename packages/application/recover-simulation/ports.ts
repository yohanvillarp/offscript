import type { Simulation, SimulationId } from "../../domain/index.ts";

export type RecoverSimulationAction = "fail" | "cancel";

export type RecoverSimulationCommand = Readonly<{
  simulationId: SimulationId;
  action?: RecoverSimulationAction | undefined;
  reason?: string | undefined;
}>;

export type RecoverSimulationResult = Readonly<{
  simulation: Simulation;
  action: RecoverSimulationAction;
  recoveredAt: string;
}>;

export interface SimulationRecoveryStore {
  findSimulation(id: SimulationId): Promise<Simulation | undefined>;
  updateSimulationAggregate(
    simulation: Simulation,
    expected: { status: "running" },
  ): Promise<"updated" | "conflict" | "not-found">;
}
