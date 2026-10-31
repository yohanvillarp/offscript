import { randomBytes } from "node:crypto";
import { openPersistence } from "../persistence/index.ts";
import { createLocalServer, createStudioSession } from "../server/index.ts";
import type { HostPhase } from "../server/index.ts";
import { simulationId } from "../domain/index.ts";
import type { SimulationId } from "../domain/index.ts";
import { createOutboxDispatcher } from "./outbox-dispatcher.ts";
import { localHostConfig } from "./host-config.ts";
import type { LocalHostOptions } from "./host-config.ts";
import { hostStorage } from "./host-storage.ts";
import type { HostStorage } from "./host-storage.ts";
import { sessionRegistry } from "./session-registry.ts";
import type { HostedSession } from "./session-registry.ts";
import { withinDeadline } from "./deadline.ts";
import { ApplicationError, executeConfigureSimulation, executeCheckTarget, executeDeleteConfiguredSimulation, executeRecoverSimulation } from "../application/index.ts";
import type { DeleteConfiguredSimulationResult, RecoverSimulationAction } from "../application/index.ts";
import { inspectProject, createTargetProbe } from "../projects/index.ts";
import { ContractValidationError, evaluateFindingAssessment, parseLocalTargetUrl } from "../contracts/index.ts";
import type { CompletedInvestigationSummary, SimulationExecutionMode, SimulationResults, SimulationSetup } from "../contracts/index.ts";
import { executionCoordinator } from "./execution-coordinator.ts";
import { createEvidenceStore } from "./evidence-store.ts";

export type HostedSessionContext = Readonly<{ storage: HostStorage; outboxMode: "external" }>;

export function createLocalHost(options: LocalHostOptions) {
  const config = localHostConfig(options);
  const onDiagnostic = options.onDiagnostic;
  const token = randomBytes(32).toString("base64url");
  const studioSession = config.studioDirectory ? createStudioSession() : undefined;
  const evidenceStore = createEvidenceStore(config.dataDirectory);
  const registry = sessionRegistry();
  const deleting = new Set<SimulationId>();
  const probe = createTargetProbe();
  const probeLifetime = new AbortController();
  let phase: HostPhase = "starting";
  let port: number | undefined;
  let origin: string | undefined;
  let closing = false;
  let coordinator: ReturnType<typeof executionCoordinator> | undefined;
  let persistence: ReturnType<typeof openPersistence> | undefined;
  let guarded: ReturnType<typeof hostStorage> | undefined;
  let server: ReturnType<typeof createLocalServer> | undefined;
  let dispatcher: ReturnType<typeof createOutboxDispatcher> | undefined;
  let starting: Promise<string> | undefined;
  let closingTask: Promise<void> | undefined;
  let releasing: Promise<void> | undefined;

  function release(): Promise<void> {
    if (releasing) return releasing;
    phase = "stopping";
    probeLifetime.abort();
    registry.stopAdmission();
    releasing = (async () => {
      const errors: unknown[] = [];
      try { await server?.close(); } catch (error) { errors.push(error); }
      const results = await Promise.allSettled([registry.close(), coordinator?.close(), dispatcher?.stop()]);
      for (const result of results) if (result.status === "rejected") errors.push(result.reason);
      // Stop publication before denying late storage calls. Already admitted DB
      // operations finish before the connection closes; provider work is separate.
      await guarded?.drain();
      try { persistence?.close(); } catch (error) { errors.push(error); }
      phase = "stopped";
      if (errors.length) throw new AggregateError(errors, "Local host cleanup failed.");
    })();
    return releasing;
  }

  async function initialize(): Promise<string> {
    try {
      persistence = openPersistence({ projectRoot: config.projectRoot, dataDirectory: config.dataDirectory });
      persistence.migrate();
      guarded = hostStorage(persistence);
      coordinator = executionCoordinator({
        storage: guarded.storage,
        prepareSession: (id, create) => registry.add(id, create),
        factory: options.sessionFactory,
        evidenceStore,
        releaseSession: (id) => registry.remove(id),
      });
      server = createLocalServer({ token, port: () => port, allowedOrigins: config.allowedOrigins, phase: () => phase,
        configurations: api,
        ...(config.studioDirectory && studioSession ? { studioDirectory: config.studioDirectory, studioSession } : {}),
      });
      await server.ready();
      if (closing) throw new Error("Host closed during startup.");
      origin = await server.listen({ host: "127.0.0.1", port: config.port });
      const address = server.server.address();
      if (!address || typeof address === "string") throw new Error("Expected a TCP listener.");
      port = address.port;
      if (closing) throw new Error("Host closed during startup.");
      dispatcher = createOutboxDispatcher({ store: guarded.storage.outbox, publisher: registry.publisher,
        publishTimeoutMs: 1_000,
        onError() {
          if (!closing) phase = "failed";
          try { onDiagnostic?.("OUTBOX_FAILED"); } catch { /* Diagnostics must not break cleanup. */ }
        },
      });
      phase = "ready";
      dispatcher.start();
      return origin;
    } catch (cause) {
      try { await release(); } catch (cleanup) {
        throw new AggregateError([cause, cleanup], "Local host startup and cleanup failed.");
      }
      throw new Error("Local host startup failed.", { cause });
    }
  }

  const api = Object.freeze({
    config,
    phase: () => phase,
    start() {
      if (closing || phase === "stopped") return Promise.reject(new Error("Host cannot restart after closing."));
      starting ??= initialize();
      return starting;
    },
    credentials() {
      if (phase !== "ready" || origin === undefined) throw new Error("Host is not ready.");
      return Object.freeze({ origin, token });
    },
    studioEntry() {
      if (phase !== "ready" || !origin || !studioSession) throw new Error("Studio is not available.");
      return Object.freeze({ origin, entry: studioSession.issueEntry() });
    },
    async listConfigurations() {
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting configuration reads.");
      return storage.configurations.listConfigurations();
    },
    async inspectProject() {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting project inspection.");
      return inspectProject(config.projectRoot);
    },
    async checkTarget(url: string, signal?: AbortSignal) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting connection checks.");
      const target = new URL(parseLocalTargetUrl(url));
      if (Number(target.port || (target.protocol === "https:" ? 443 : 80)) === port) {
        throw new ContractValidationError("target.url", "Select the application port, not OFFSCRIPT's port.");
      }
      return executeCheckTarget(url, probe, AbortSignal.any([probeLifetime.signal, ...(signal ? [signal] : [])]));
    },
    async configureSimulation(input: Readonly<{ simulationId: SimulationId; setup: SimulationSetup }>) {
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting simulation configuration.");
      return executeConfigureSimulation({ ...input, projectRoot: config.projectRoot }, {
        projects: { inspectProject }, configurations: { ...storage.configurations,
          async createConfiguredSimulation(configuration, simulation) {
            if (phase !== "ready" || closing) throw new Error("Host closed before configuration commit.");
            return storage.configurations.createConfiguredSimulation(configuration, simulation);
          },
        },
      });
    },
    async findConfiguration(id: SimulationId) {
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting configuration reads.");
      return storage.configurations.findConfiguration(simulationId(id));
    },
    async deleteConfiguration(id: SimulationId): Promise<DeleteConfiguredSimulationResult> {
      simulationId(id);
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting deletion requests.");
      if (registry.has(id) || deleting.has(id) || coordinator?.hasActive(id)) return "not-allowed";
      deleting.add(id);
      try {
        const result = await executeDeleteConfiguredSimulation(id, storage.configurations);
        if (result === "deleted") {
          void evidenceStore.deleteSimulationEvidence(id);
          coordinator?.remove(id);
        }
        return result;
      }
      finally { deleting.delete(id); }
    },
    async startSimulation(id: SimulationId, mode: SimulationExecutionMode, options: Readonly<{ headless?: boolean | undefined }> = {}) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting execution commands.");
      if (!coordinator) throw new Error("No execution session factory configured on this host.");
      return coordinator.start(simulationId(id), mode, options);
    },
    async stopSimulation(id: SimulationId) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting execution commands.");
      if (!coordinator) throw new Error("No execution session factory configured on this host.");
      return coordinator.stop(simulationId(id));
    },
    async inspectExecution(id: SimulationId) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting execution inspection.");
      if (!coordinator) throw new Error("No execution session factory configured on this host.");
      return coordinator.inspect(simulationId(id));
    },
    async recoverSimulation(id: SimulationId, action?: RecoverSimulationAction, reason?: string) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting recovery commands.");
      const storage = guarded?.storage;
      if (!storage) throw new Error("Storage not initialized.");
      if (coordinator?.hasActive(simulationId(id))) {
        throw new ApplicationError("EXECUTION_ALREADY_ACTIVE", "Cannot recover an actively executing simulation.");
      }
      await executeRecoverSimulation({ simulationId: simulationId(id), action, reason }, storage.simulations);
      return coordinator?.inspect(simulationId(id)) ?? Object.freeze({
        simulationId: id, phase: action === "cancel" ? "cancelled" : "failed",
        turnsCount: 0, activeAgents: [],
      });
    },
    async getSimulationResults(id: SimulationId): Promise<SimulationResults> {
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting results queries.");
      const observations = await storage.observations.listObservations(simulationId(id));
      const investigations = await storage.investigations.listInvestigations(simulationId(id));
      const completed = investigations.filter((inv): inv is CompletedInvestigationSummary => inv.lifecycle.status === "completed");
      const findings = completed.map(inv => evaluateFindingAssessment(inv, observations));
      return Object.freeze({
        simulationId: id,
        observations,
        investigations,
        findings,
      });
    },
    async getEvidence(id: SimulationId, evidenceId: string) {
      if (phase !== "ready" || closing) throw new Error("Host is not accepting evidence queries.");
      return evidenceStore.getEvidence(simulationId(id), evidenceId);
    },
    prepareSession<T extends HostedSession>(id: SimulationId, create: (context: HostedSessionContext) => T): T {
      simulationId(id);
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting sessions.");
      if (deleting.has(id)) throw new Error("Simulation deletion is in progress.");
      return registry.add(id, () => create(Object.freeze({ storage, outboxMode: "external" })));
    },
    close() {
      if (closingTask) return closingTask;
      if (phase === "stopped") {
        closing = true;
        closingTask = releasing ?? Promise.resolve();
        return closingTask;
      }
      closing = true;
      probeLifetime.abort();
      registry.stopAdmission();
      phase = "stopping";
      const cleanup = (async () => { await starting?.catch(() => {}); await release(); })();
      closingTask = withinDeadline(cleanup, config.shutdownTimeoutMs);
      return closingTask;
    },
  });
  return api;
}
