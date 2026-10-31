import type { FastifyInstance } from "fastify";
import { simulationId } from "../domain/index.ts";
import { parseSimulationSetup } from "../contracts/index.ts";
import type { ProjectDescriptor, SimulationConfiguration, SimulationSetup } from "../contracts/index.ts";

export type ConfigurationServices = Readonly<{
  inspectProject(): Promise<ProjectDescriptor>;
  configureSimulation(input: Readonly<{ simulationId: ReturnType<typeof simulationId>; setup: SimulationSetup }>): Promise<Readonly<{ configuration: SimulationConfiguration }>>;
  findConfiguration(id: ReturnType<typeof simulationId>): Promise<SimulationConfiguration | undefined>;
  listConfigurations(): Promise<readonly SimulationConfiguration[]>;
}>;

export function configurationRoutes(server: FastifyInstance, services: ConfigurationServices): void {
  server.get("/api/project", async () => services.inspectProject());
  server.get("/api/simulations", async () => services.listConfigurations());
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
}
