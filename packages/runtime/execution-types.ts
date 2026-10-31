import type { AgentId, Simulation, SimulationId } from "../domain/index.ts";
import type {
  ExecutionLimits,
  SimulationExecutionMode,
  SimulationExecutionPhase,
} from "../contracts/index.ts";
import type { HostStorage } from "./host-storage.ts";
import type { HostedSession } from "./session-registry.ts";

export type ExecutionSessionHandle = HostedSession & {
  startTurn(agentId: AgentId, message: string): boolean;
  snapshot?(): { turns?: readonly { agentId: AgentId; count: number }[] };
  waitForIdle?(timeoutMs?: number): Promise<unknown>;
};

export type ExecutionSessionContext = Readonly<{
  mode?: SimulationExecutionMode | undefined;
  targetUrl?: string | undefined;
}>;

export type ExecutionSessionFactory = (
  simulation: Simulation,
  limits: ExecutionLimits,
  storage: HostStorage,
  context?: ExecutionSessionContext | undefined,
) => ExecutionSessionHandle;

export type ActiveExecution = {
  readonly simulationId: SimulationId;
  phase: SimulationExecutionPhase;
  readonly mode: SimulationExecutionMode;
  turnsCount: number;
  readonly activeAgents: readonly string[];
  readonly startedAt: string;
  stoppedAt?: string;
  failureReason?: string;
  session?: ExecutionSessionHandle;
  timer?: NodeJS.Timeout;
};
