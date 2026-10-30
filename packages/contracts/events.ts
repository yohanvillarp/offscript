import type { AgentId, SimulationId } from "../domain/index.ts";
import type { AgentSummary, SimulationSummary } from "./summaries.ts";

export type EventOrigin =
  | Readonly<{ kind: "system" }>
  | Readonly<{ kind: "agent"; agentId: AgentId }>;

export type EventMetadata = Readonly<{
  eventId: string;
  occurredAt: string;
  simulationId: SimulationId;
  origin: EventOrigin;
  correlationId: string;
}>;

type SimulationAt<S extends SimulationSummary["lifecycle"]["status"]> =
  Readonly<Omit<SimulationSummary, "lifecycle"> & {
    lifecycle: SimulationSummary["lifecycle"] & Readonly<{ status: S }>;
  }>;

type AgentAt<S extends AgentSummary["lifecycle"]["status"]> =
  Readonly<Omit<AgentSummary, "lifecycle"> & {
    lifecycle: AgentSummary["lifecycle"] & Readonly<{ status: S }>;
  }>;

export type SimulationEventPayload<S extends SimulationSummary["lifecycle"]["status"]> =
  Readonly<{ simulation: SimulationAt<S> }>;
export type AgentEventPayload<S extends AgentSummary["lifecycle"]["status"]> =
  Readonly<{ agent: AgentAt<S> }>;

export type LifecyclePayloads = {
  readonly "simulation.started": SimulationEventPayload<"running">;
  readonly "simulation.completed": SimulationEventPayload<"completed">;
  readonly "simulation.failed": SimulationEventPayload<"failed">;
  readonly "simulation.cancelled": SimulationEventPayload<"cancelled">;
  readonly "agent.started": AgentEventPayload<"running">;
  readonly "agent.completed": AgentEventPayload<"completed">;
  readonly "agent.failed": AgentEventPayload<"failed">;
  readonly "agent.cancelled": AgentEventPayload<"cancelled">;
};

export type LifecycleEventType = keyof LifecyclePayloads;

export type LifecycleEvent = {
  [K in LifecycleEventType]: Readonly<EventMetadata & {
    type: K;
    schemaVersion: 1;
    payload: LifecyclePayloads[K];
  }>;
}[LifecycleEventType];
