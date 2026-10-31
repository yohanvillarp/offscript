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
import { executeConfigureSimulation } from "../application/index.ts";
import { inspectProject } from "../projects/index.ts";
import type { SimulationSetup } from "../contracts/index.ts";

export type HostedSessionContext = Readonly<{ storage: HostStorage; outboxMode: "external" }>;

export function createLocalHost(options: LocalHostOptions) {
  const config = localHostConfig(options);
  const onDiagnostic = options.onDiagnostic;
  const token = randomBytes(32).toString("base64url");
  const studioSession = config.studioDirectory ? createStudioSession() : undefined;
  const registry = sessionRegistry();
  let phase: HostPhase = "starting";
  let port: number | undefined;
  let origin: string | undefined;
  let closing = false;
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
    registry.stopAdmission();
    releasing = (async () => {
      const errors: unknown[] = [];
      try { await server?.close(); } catch (error) { errors.push(error); }
      const results = await Promise.allSettled([registry.close(), dispatcher?.stop()]);
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
    prepareSession<T extends HostedSession>(id: SimulationId, create: (context: HostedSessionContext) => T): T {
      simulationId(id);
      const storage = guarded?.storage;
      if (phase !== "ready" || closing || !storage) throw new Error("Host is not accepting sessions.");
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
      registry.stopAdmission();
      phase = "stopping";
      const cleanup = (async () => { await starting?.catch(() => {}); await release(); })();
      closingTask = withinDeadline(cleanup, config.shutdownTimeoutMs);
      return closingTask;
    },
  });
  return api;
}
