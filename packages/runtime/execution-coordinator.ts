import { simulationId, transitionSimulation, updateSimulationAgent } from "../domain/index.ts";
import type { AgentId, AgentLifecycle, SimulationId } from "../domain/index.ts";
import type { SimulationExecutionMode, SimulationExecutionStatus } from "../contracts/index.ts";
import { ApplicationError } from "../application/index.ts";
import type { HostStorage } from "./host-storage.ts";
import type { HostedSession } from "./session-registry.ts";
import type { ActiveExecution, ExecutionSessionFactory, ExecutionSessionHandle } from "./execution-types.ts";
import { inspectExecutionFailures, settleSimulationAggregate } from "./execution-settlement.ts";
import type { SettlementOutcome } from "./execution-settlement.ts";
import type { EvidenceStore } from "./evidence-store.ts";

export type { ExecutionSessionContext, ExecutionSessionFactory, ExecutionSessionHandle } from "./execution-types.ts";

export function executionCoordinator(dependencies: {
  storage: HostStorage;
  prepareSession: <T extends HostedSession>(id: SimulationId, create: () => T) => T;
  factory?: ExecutionSessionFactory | undefined;
  evidenceStore?: EvidenceStore | undefined;
}) {
  const { storage, prepareSession, factory, evidenceStore } = dependencies;
  const active = new Map<SimulationId, ActiveExecution>();
  let closed = false;

  function toStatus(record: ActiveExecution): SimulationExecutionStatus {
    let turnsCount = record.turnsCount;
    let recentActivity: readonly { agentId: string; action: string; location?: string | undefined; timestamp: string }[] | undefined;
    let activeAgents: readonly string[] = (record.phase === "starting" || record.phase === "running") ? record.activeAgents : [];
    if (record.session?.snapshot) {
      const snap = record.session.snapshot();
      if (snap.turns) turnsCount = snap.turns.reduce((sum, item) => sum + item.count, 0);
      if (snap.recentActivity) recentActivity = snap.recentActivity;
      if ((record.phase === "starting" || record.phase === "running") && snap.activeAgents) {
        activeAgents = snap.activeAgents;
      }
    }
    return Object.freeze({
      simulationId: record.simulationId, phase: record.phase, mode: record.mode,
      turnsCount, activeAgents,
      ...(record.failureReason ? { failureReason: record.failureReason } : {}),
      startedAt: record.startedAt,
      ...(record.stoppedAt ? { stoppedAt: record.stoppedAt } : {}),
      ...(recentActivity ? { recentActivity } : {}),
    });
  }

  async function finalizeExecution(record: ActiveExecution, outcome: SettlementOutcome, reason?: string): Promise<void> {
    record.phase = "stopping";
    if (record.timer) clearTimeout(record.timer);
    const result = await settleSimulationAggregate(storage, record.simulationId, outcome, reason);
    let closeError: unknown;
    try { await record.session?.close(); } catch (err) { closeError = err; }
    record.stoppedAt = new Date().toISOString();
    if (closeError) {
      record.phase = "failed";
      record.failureReason = "SESSION_CLOSE_FAILED";
    } else if (!result.settled && (result.reason === "storage-error" || result.reason === "conflict")) {
      record.phase = "failed";
      record.failureReason = result.reason === "conflict" ? "SETTLEMENT_CONFLICT" : "SETTLEMENT_STORAGE_FAILED";
    } else {
      record.phase = outcome;
      if (reason) record.failureReason = reason;
    }
  }

  async function handleBudgetExpiry(id: SimulationId): Promise<void> {
    const record = active.get(id);
    if (!record || record.phase !== "running") return;
    await finalizeExecution(record, "cancelled", "SESSION_BUDGET_EXHAUSTED");
  }

  function monitorSettlement(id: SimulationId, session: ExecutionSessionHandle, durationMs: number): void {
    if (!session.waitForIdle) return;
    void session.waitForIdle(durationMs).then(async (snap) => {
      const record = active.get(id);
      if (!record || record.phase !== "running") return;
      const failureCheck = inspectExecutionFailures(snap ?? record.session?.snapshot?.());
      if (failureCheck.hasFailures) {
        await finalizeExecution(record, "failed", failureCheck.reason ?? "SESSION_EXECUTION_FAILED");
      } else {
        await finalizeExecution(record, "completed");
      }
    }).catch(async (cause) => {
      const record = active.get(id);
      if (!record || record.phase !== "running") return;
      const isTimeout = cause instanceof Error && cause.message.includes("timed out");
      const reason = isTimeout ? "SESSION_BUDGET_EXHAUSTED" : "SESSION_EXECUTION_FAILED";
      const outcome: SettlementOutcome = isTimeout ? "cancelled" : "failed";
      await finalizeExecution(record, outcome, reason);
    });
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
    if (!config || !sim) throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation configuration not found.");
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
        factory(runningSim, config.limits, storage, {
          mode,
          targetUrl: config.targetUrl,
          evidenceStore,
        }),
      );
      record.session = session;
      record.phase = "running";
      record.timer = setTimeout(() => { void handleBudgetExpiry(id); }, config.limits.durationMs);
      monitorSettlement(id, session, config.limits.durationMs);

      for (const agent of sim.agents) {
        const initialPrompt =
          mode === "browser-exploration"
            ? `Explore the application at ${config.targetUrl}. Pursue the goal: ${config.goal}`
            : "Explore the local cart and check items.";
        session.startTurn(agent.id, initialPrompt);
      }
      return toStatus(record);
    } catch (cause) {
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
      await finalizeExecution(record, "cancelled");
      return toStatus(record);
    }
    const current = await storage.simulations.findSimulation(id);
    if (!current) throw new ApplicationError("SIMULATION_NOT_FOUND", "Simulation not found.");
    if (current.lifecycle.status === "running") {
      await settleSimulationAggregate(storage, id, "cancelled");
      return Object.freeze({
        simulationId: id, phase: "cancelled",
        turnsCount: 0, activeAgents: [],
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
        simulationId: id, phase: "idle", turnsCount: 0, activeAgents: [],
      });
    }
    if (sim.lifecycle.status === "running") {
      return Object.freeze({
        simulationId: id, phase: "interrupted",
        turnsCount: 0, activeAgents: [],
        failureReason: "INTERRUPTED_BY_HOST_RESTART",
      });
    }
    return Object.freeze({
      simulationId: id, phase: sim.lifecycle.status,
      turnsCount: 0, activeAgents: [],
      ...(sim.lifecycle.status === "failed" ? { failureReason: sim.lifecycle.reason } : {}),
    });
  }

  async function close(): Promise<void> {
    closed = true;
    const items = Array.from(active.values());
    for (const record of items) {
      if (record.phase === "starting" || record.phase === "running") {
        await finalizeExecution(record, "cancelled");
      }
    }
    active.clear();
  }

  return Object.freeze({ start, stop, inspect, close, hasActive: (id: SimulationId) => active.has(id) });
}
