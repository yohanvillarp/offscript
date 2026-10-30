import type { AgentId, SimulationId } from "../../domain/index.ts";
import type { LifecycleEvent, LifecyclePayloads } from "../index.ts";

// Compile-only negative cases: tsc must reject each marked expression.
export function verifyDiscrimination(event: LifecycleEvent, simulationId: SimulationId, agentId: AgentId): void {
  if (event.type === "agent.failed") {
    const reason: string = event.payload.agent.lifecycle.reason;
    const affected: AgentId = event.payload.agent.id;
    void reason;
    void affected;
    // @ts-expect-error A failed payload cannot be used as a started payload.
    const incompatible: LifecyclePayloads["agent.started"] = event.payload;
    void incompatible;
    // @ts-expect-error Agent events do not carry simulation summary payloads.
    void event.payload.simulation;
    // @ts-expect-error Public snapshots are readonly.
    event.payload.agent.name = "Changed";
  }
  if (event.type === "simulation.started") {
    const status: "running" = event.payload.simulation.lifecycle.status;
    void status;
    // @ts-expect-error Simulation IDs cannot be confused with agent IDs.
    const wrongId: AgentId = event.payload.simulation.id;
    void wrongId;
  }
  if (event.origin.kind === "system") {
    // @ts-expect-error A system origin has no originating agent ID.
    void event.origin.agentId;
  }
  const payload: LifecyclePayloads["agent.failed"] = {
    agent: {
      id: agentId, simulationId, name: "Visitor",
      // @ts-expect-error Failed participation requires a reason.
      lifecycle: { status: "failed" },
    },
  };
  void payload;
  // @ts-expect-error Lifecycle event names are a closed union.
  const unknownType: LifecycleEvent["type"] = "observation.created";
  void unknownType;
  // @ts-expect-error Version 1 is the only supported schema version.
  const unknownVersion: LifecycleEvent["schemaVersion"] = 2;
  void unknownVersion;
}
