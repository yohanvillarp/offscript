import { simulationId, transitionSimulation, updateSimulationAgent } from "../domain/index.ts";
import type { AgentId, AgentLifecycle, Simulation, SimulationId } from "../domain/index.ts";
import type { ExecutionLimits, SimulationExecutionMode, SimulationExecutionPhase, SimulationExecutionStatus } from "../contracts/index.ts";
import { ApplicationError } from "../application/index.ts";
import type { HostStorage } from "./host-storage.ts";
import type { HostedSession } from "./session-registry.ts";

export type ExecutionSessionHandle = HostedSession & {
  startTurn(agentId: AgentId, message: string): boolean;
  snapshot?(): { turns?: readonly { agentId: AgentId; count: number }[] };
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

type ActiveExecution = {
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

export function executionCoordinator(dependencies: {
  storage: HostStorage;
  prepareSession: <T extends HostedSession>(id: SimulationId, create: () => T) => T;
  factory?: ExecutionSessionFactory | undefined;
}) {
  const { storage, prepareSession, factory } = dependencies;
  const active = new Map<SimulationId, ActiveExecution>();
  let closed = false;

  function toStatus(record: ActiveExecution): SimulationExecutionStatus {
    let turnsCount = record.turnsCount;
    if (record.session?.snapshot) {
      const snap = record.session.snapshot();
      if (snap.turns) {
        turnsCount = snap.turns.reduce((sum, item) => sum + item.count, 0);
      }
    }
    return Object.freeze({
      simulationId: record.simulationId,
      phase: record.phase,
      mode: record.mode,
      turnsCount,
      activeAgents: record.activeAgents,
      ...(record.failureReason ? { failureReason: record.failureReason } : {}),
      startedAt: record.startedAt,
      ...(record.stoppedAt ? { stoppedAt: record.stoppedAt } : {}),
    });
  }

  async function handleBudgetExpiry(id: SimulationId): Promise<void> {
    const record = active.get(id);
    if (!record || record.phase !== "running") return;
    record.phase = "stopping";
    try { await record.session?.close(); } catch { /* Session close cleanup */ }
    try {
      const currentSim = await storage.simulations.findSimulation(id);
      if (currentSim && currentSim.lifecycle.status === "running") {
        const cancelledSim = transitionSimulation(currentSim, { status: "cancelled" });
        await storage.simulations.updateSimulationAggregate(cancelledSim, { status: "running" });
      }
    } catch { /* Suppress background update error */ }
    record.phase = "cancelled";
    record.failureReason = "SESSION_BUDGET_EXHAUSTED";
    record.stoppedAt = new Date().toISOString();
  }

  async function start(id: SimulationId, mode: SimulationExecutionMode): Promise<SimulationExecutionStatus> {
    if (closed) throw new ApplicationError("EXECUTION_START_FAILED", "Host is closing.");
    if (!factory) throw new ApplicationError("EXECUTION_START_FAILED", "No execution session factory configured on this host.");
    if (mode !== "controlled-demo" && mode !== "browser-exploration") {
      throw new ApplicationError("INVALID_EXECUTION_STATE", `Unsupported execution mode: ${mode}`);
    }
    const existing = active.get(id);
    if (existing && (existing.phase === "starting" || existing.phase === "running" || existing.phase === "stopping")) {
      throw new ApplicationError("EXECUTION_ALREADY_ACTIVE", "Simulation is already executing.");
    }
    const [config, sim] = await Promise.all([
      storage.configurations.findConfiguration(id),
      storage.simulations.findSimulation(id),
    ]);
    if (!config || !sim) {
      throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation configuration not found.");
    }
    if (sim.lifecycle.status !== "created") {
      throw new ApplicationError("INVALID_EXECUTION_STATE", `Simulation cannot start from status ${sim.lifecycle.status}.`);
    }
    if (sim.agents.some((agent) => agent.lifecycle.status !== "ready")) {
      throw new ApplicationError("INVALID_EXECUTION_STATE", "All agents must be ready to start.");
    }

    let runningSim = transitionSimulation(sim, { status: "running" });
    for (const agent of sim.agents) {
      runningSim = updateSimulationAgent(runningSim, agent.id, { status: "running" });
    }
    const expectedAgentStatuses = new Map<AgentId, AgentLifecycle["status"]>(
      sim.agents.map((agent) => [agent.id, "ready"]),
    );
    const commit = await storage.simulations.updateSimulationAggregate(runningSim, {
      status: "created",
      agentStatuses: expectedAgentStatuses,
    });
    if (commit === "conflict") throw new ApplicationError("EXECUTION_ALREADY_ACTIVE", "Simulation state changed concurrently.");
    if (commit === "not-found") throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");

    const startedAt = new Date().toISOString();
    const record: ActiveExecution = {
      simulationId: id, phase: "starting", mode, turnsCount: 0,
      activeAgents: sim.agents.map((agent) => agent.id), startedAt,
    };
    active.set(id, record);

    try {
      const session = prepareSession(id, () =>
        factory(runningSim, config.limits, storage, { mode, targetUrl: config.targetUrl }),
      );
      record.session = session;
      record.phase = "running";
      record.timer = setTimeout(() => { void handleBudgetExpiry(id); }, config.limits.durationMs);

      const firstAgent = sim.agents[0];
      if (firstAgent) {
        const initialPrompt =
          mode === "browser-exploration"
            ? `Explore the application at ${config.targetUrl}. Pursue the goal: ${config.goal}`
            : "Explore the local cart and check items.";
        session.startTurn(firstAgent.id, initialPrompt);
      }
      return toStatus(record);
    } catch (cause) {
      // Partial failure containment: roll back / mark simulation as failed in storage
      if (record.session) {
        try { await record.session.close(); } catch { /* Safe cleanup */ }
      }
      try {
        const failedSim = transitionSimulation(runningSim, { status: "failed", reason: "RUNTIME_INITIALIZATION_FAILED" });
        await storage.simulations.updateSimulationAggregate(failedSim, { status: "running" });
      } catch { /* Best-effort aggregate update */ }
      record.phase = "failed";
      record.failureReason = "RUNTIME_INITIALIZATION_FAILED";
      record.stoppedAt = new Date().toISOString();
      throw new ApplicationError("EXECUTION_START_FAILED", "Failed to initialize runtime session.", { cause });
    }
  }

  async function stop(id: SimulationId): Promise<SimulationExecutionStatus> {
    simulationId(id);
    const record = active.get(id);
    if (record && (record.phase === "starting" || record.phase === "running")) {
      record.phase = "stopping";
      if (record.timer) clearTimeout(record.timer);
      try { await record.session?.close(); } catch { /* Ignore close error */ }
      try {
        const currentSim = await storage.simulations.findSimulation(id);
        if (currentSim && currentSim.lifecycle.status === "running") {
          const cancelledSim = transitionSimulation(currentSim, { status: "cancelled" });
          await storage.simulations.updateSimulationAggregate(cancelledSim, { status: "running" });
        }
      } catch { /* Best-effort aggregate update */ }
      record.phase = "cancelled";
      record.stoppedAt = new Date().toISOString();
      return toStatus(record);
    }
    const current = await storage.simulations.findSimulation(id);
    if (!current) throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");
    if (current.lifecycle.status === "running") {
      const cancelledSim = transitionSimulation(current, { status: "cancelled" });
      await storage.simulations.updateSimulationAggregate(cancelledSim, { status: "running" });
      return Object.freeze({
        simulationId: id, phase: "cancelled", mode: "controlled-demo",
        turnsCount: 0, activeAgents: current.agents.map((agent) => agent.id),
      });
    }
    return inspect(id);
  }

  async function inspect(id: SimulationId): Promise<SimulationExecutionStatus> {
    simulationId(id);
    const record = active.get(id);
    if (record) return toStatus(record);

    const sim = await storage.simulations.findSimulation(id);
    if (!sim) throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");

    if (sim.lifecycle.status === "created") {
      return Object.freeze({
        simulationId: id, phase: "idle", mode: "controlled-demo",
        turnsCount: 0, activeAgents: [],
      });
    }
    if (sim.lifecycle.status === "running") {
      // Running in storage but no handle in memory: interrupted by host restart
      return Object.freeze({
        simulationId: id, phase: "interrupted", mode: "controlled-demo",
        turnsCount: 0, activeAgents: sim.agents.map((agent) => agent.id),
        failureReason: "INTERRUPTED_BY_HOST_RESTART",
      });
    }
    return Object.freeze({
      simulationId: id,
      phase: sim.lifecycle.status,
      mode: "controlled-demo",
      turnsCount: 0,
      activeAgents: sim.agents.map((agent) => agent.id),
      ...(sim.lifecycle.status === "failed" ? { failureReason: sim.lifecycle.reason } : {}),
    });
  }

  async function close(): Promise<void> {
    closed = true;
    const items = Array.from(active.values());
    for (const record of items) {
      if (record.timer) clearTimeout(record.timer);
      if (record.phase === "starting" || record.phase === "running") {
        record.phase = "stopping";
        try { await record.session?.close(); } catch { /* Ignore close error */ }
        record.phase = "cancelled";
        record.stoppedAt = new Date().toISOString();
      }
    }
    active.clear();
  }

  return Object.freeze({ start, stop, inspect, close, hasActive: (id: SimulationId) => active.has(id) });
}
