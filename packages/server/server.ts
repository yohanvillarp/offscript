import Fastify from "fastify";
import { errorSchema, healthSchemas } from "./contracts.ts";
import type { HostPhase } from "./contracts.ts";
import { secureLocalAccess } from "./security.ts";
import type { AccessOptions } from "./security.ts";
import { ContractValidationError } from "../contracts/index.ts";
import { DomainError } from "../domain/index.ts";
import { ApplicationError } from "../application/index.ts";
import { configurationRoutes } from "./configuration-routes.ts";
import type { ConfigurationServices } from "./configuration-routes.ts";
import { studioAssets } from "./studio-assets.ts";

export function createLocalServer(options: AccessOptions & Readonly<{ phase: () => HostPhase; configurations?: ConfigurationServices; studioDirectory?: string }>) {
  const server = Fastify({ logger: false, trustProxy: false, bodyLimit: 1024,
    requestTimeout: 5_000, connectionTimeout: 5_000, forceCloseConnections: true, exposeHeadRoutes: false });
  server.addSchema({ $id: "host-error", ...errorSchema });
  secureLocalAccess(server, options);
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof ContractValidationError) return reply.code(400).send({ error: "INVALID_CONFIGURATION", field: error.path });
    if (error instanceof DomainError) return reply.code(400).send({ error: "INVALID_CONFIGURATION" });
    if (error instanceof ApplicationError) {
      if (error.code === "SIMULATION_ALREADY_EXISTS") return reply.code(409).send({ error: "SIMULATION_ALREADY_EXISTS" });
      if (error.code === "SIMULATION_NOT_FOUND") return reply.code(404).send({ error: "NOT_FOUND" });
      if (error.code === "EXECUTION_ALREADY_ACTIVE" || error.code === "INVALID_EXECUTION_STATE") {
        return reply.code(409).send({ error: "EXECUTION_CONFLICT" });
      }
    }
    const code = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    const status = typeof code === "number" && code >= 400 && code < 500 ? 400 : 500;
    return reply.code(status).send({ error: status === 400 ? "INVALID_REQUEST" : "INTERNAL_ERROR" });
  });
  if (options.configurations) configurationRoutes(server, options.configurations);
  if (options.studioDirectory && options.studioSession) studioAssets(server, options.studioDirectory, options.studioSession);
  server.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "NOT_FOUND" }));
  server.get("/health/live", { schema: healthSchemas.live }, async () => ({ status: "alive" }));
  server.get("/health/ready", { schema: healthSchemas.ready }, async (_request, reply) => {
    if (options.phase() !== "ready") return reply.code(503).send({ status: "not-ready" });
    return { status: "ready" };
  });
  return server;
}
