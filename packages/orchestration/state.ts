import { RuntimeState } from "@mozaik-ai/core";
import type { Agent } from "@mozaik-ai/core";
import type { AgentId, InvestigationId, Observation, ObservationId, Simulation } from "../domain/index.ts";
import type { VersionedInvestigation } from "../application/index.ts";
import type { SemanticEvent } from "../contracts/index.ts";
import { createMemoryOutbox } from "./memory-outbox.ts";

export type ToolName =
  | "inspect_application"
  | "record_observation"
  | "request_investigation"
  | "complete_investigation"
  | "browser_navigate"
  | "browser_inspect"
  | "browser_click"
  | "browser_type"
  | "browser_scroll"
  | "browser_select";
export type RuntimeFailure = Readonly<{ stage: string; agentId: AgentId | undefined; cause: unknown }>;
export type TurnState = { busy: boolean; turns: number; inferenceCalls: number; pending: string[]; reservations: number };

export type ActivityRecord = Readonly<{
  agentId: string;
  action: string;
  location?: string | undefined;
  timestamp: string;
}>;

export class ExplorationState extends RuntimeState {
  readonly outbox = createMemoryOutbox();
  readonly observations = new Map<ObservationId, Observation>();
  readonly investigations = new Map<InvestigationId, VersionedInvestigation>();
  readonly events: SemanticEvent[] = [];
  readonly failures: RuntimeFailure[] = [];
  readonly agents = new Map<AgentId, Agent>();
  readonly domainIds = new Map<string, AgentId>();
  readonly turns = new Map<AgentId, TurnState>();
  readonly permissions = new Map<AgentId, ReadonlySet<ToolName>>();
  readonly reactions = new Set<string>();
  readonly seenEvents = new Set<string>();
  readonly dispatchedEvents = new Map<string, string>();
  readonly recentActivity: ActivityRecord[] = [];
  closed = false;
  pendingCallbacks = 0;
  systemId = "";

  simulation: Simulation;

  constructor(simulation: Simulation) { super(); this.simulation = simulation; }

  recordActivity(agentId: string, action: string, location?: string): void {
    if (this.recentActivity.length >= 20) this.recentActivity.shift();
    this.recentActivity.push(Object.freeze({
      agentId, action, timestamp: new Date().toISOString(), ...(location ? { location } : {}),
    }));
  }

  fail(stage: string, agentId: AgentId | undefined, cause: unknown): void {
    this.failures.push(Object.freeze({ stage, agentId, cause }));
  }
}
