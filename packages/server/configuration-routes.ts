import type { FastifyInstance } from "fastify";
import { simulationId } from "../domain/index.ts";
import { parseSimulationSetup, parseStartSimulationRequest } from "../contracts/index.ts";
import type {
  ProjectDescriptor, SimulationConfiguration, SimulationExecutionMode, SimulationExecutionStatus,
  SimulationResults, SimulationSetup, TargetConnection,
} from "../contracts/index.ts";
import { parseLocalTargetUrl } from "../contracts/index.ts";
import type { DeleteConfiguredSimulationResult } from "../application/index.ts";

export type ConfigurationServices = Readonly<{
  inspectProject(): Promise<ProjectDescriptor>;
  checkTarget(url: string, signal?: AbortSignal): Promise<TargetConnection>;
  configureSimulation(input: Readonly<{ simulationId: ReturnType<typeof simulationId>; setup: SimulationSetup }>): Promise<Readonly<{ configuration: SimulationConfiguration }>>;
  findConfiguration(id: ReturnType<typeof simulationId>): Promise<SimulationConfiguration | undefined>;
  listConfigurations(): Promise<readonly SimulationConfiguration[]>;
  deleteConfiguration(id: ReturnType<typeof simulationId>): Promise<DeleteConfiguredSimulationResult>;
  startSimulation(id: ReturnType<typeof simulationId>, mode: SimulationExecutionMode): Promise<SimulationExecutionStatus>;
  stopSimulation(id: ReturnType<typeof simulationId>): Promise<SimulationExecutionStatus>;
  inspectExecution(id: ReturnType<typeof simulationId>): Promise<SimulationExecutionStatus>;
  getSimulationResults(id: ReturnType<typeof simulationId>): Promise<SimulationResults>;
}>;


export function configurationRoutes(server: FastifyInstance, services: ConfigurationServices): void {
  server.get("/api/project", async () => services.inspectProject());
  server.post("/api/target/check", { bodyLimit: 4096 }, async (request, reply) => {
    const body = request.body;
    if (!body || typeof body !== "object" || Array.isArray(body) || !('url' in body) || Object.keys(body).some(key => key !== "url")) {
      return reply.code(400).send({ error: "INVALID_REQUEST" });
    }
    const abort = new AbortController();
    const disconnect = () => { if (!reply.raw.writableFinished) abort.abort(); };
    reply.raw.once("close", disconnect);
    try { return await services.checkTarget(parseLocalTargetUrl(body.url), abort.signal); }
    finally { reply.raw.off("close", disconnect); }
  });
  server.get("/api/simulations", async () => services.listConfigurations());
  server.delete<{ Params: { id: string } }>("/api/simulations/:id", async (request, reply) => {
    const result = await services.deleteConfiguration(simulationId(request.params.id));
    if (result === "not-found") return reply.code(404).send({ error: "NOT_FOUND" });
    if (result === "not-allowed") return reply.code(409).send({ error: "DELETION_NOT_ALLOWED" });
    return reply.code(204).send();
  });
  server.post("/api/simulations", { bodyLimit: 16_384 }, async (request, reply) => {
    const body = request.body;
    if (body === null || typeof body !== "object" || Array.isArray(body) ||
      Reflect.ownKeys(body).some(key => key !== "simulationId" && key !== "setup") || !("simulationId" in body) || !("setup" in body) || typeof body.simulationId !== "string") {
      return reply.code(400).send({ error: "INVALID_REQUEST" });
    }
    const result = await services.configureSimulation({ simulationId: simulationId(body.simulationId), setup: parseSimulationSetup(body.setup) });
    return reply.code(201).send(result.configuration);
  });
  server.get<{ Params: { id: string } }>("/api/simulations/:id", async (request, reply) => {
    const value = await services.findConfiguration(simulationId(request.params.id));
    if (!value) return reply.code(404).send({ error: "NOT_FOUND" });
    return value;
  });
  server.post<{ Params: { id: string } }>("/api/simulations/:id/start", { bodyLimit: 4096 }, async (request, reply) => {
    const { mode } = parseStartSimulationRequest(request.body);
    const status = await services.startSimulation(simulationId(request.params.id), mode);
    return reply.code(200).send(status);
  });
  server.get<{ Params: { id: string } }>("/api/simulations/:id/execution", async (request) => {
    return services.inspectExecution(simulationId(request.params.id));
  });
  server.get<{ Params: { id: string } }>("/api/simulations/:id/results", async (request, reply) => {
    const id = simulationId(request.params.id);
    const value = await services.findConfiguration(id);
    if (!value) return reply.code(404).send({ error: "NOT_FOUND" });
    return services.getSimulationResults(id);
  });
  server.post<{ Params: { id: string } }>("/api/simulations/:id/stop", async (request) => {
    return services.stopSimulation(simulationId(request.params.id));
  });
}
