import Fastify from "fastify";
import { errorSchema, healthSchemas } from "./contracts.ts";
import type { HostPhase } from "./contracts.ts";
import { secureLocalAccess } from "./security.ts";
import type { AccessOptions } from "./security.ts";

export function createLocalServer(options: AccessOptions & Readonly<{ phase: () => HostPhase }>) {
  const server = Fastify({ logger: false, trustProxy: false, bodyLimit: 1024,
    requestTimeout: 5_000, connectionTimeout: 5_000, forceCloseConnections: true, exposeHeadRoutes: false });
  server.addSchema({ $id: "host-error", ...errorSchema });
  secureLocalAccess(server, options);
  server.setErrorHandler((error, _request, reply) => {
    const code = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    const status = typeof code === "number" && code >= 400 && code < 500 ? 400 : 500;
    return reply.code(status).send({ error: status === 400 ? "INVALID_REQUEST" : "INTERNAL_ERROR" });
  });
  server.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "NOT_FOUND" }));
  server.get("/health/live", { schema: healthSchemas.live }, async () => ({ status: "alive" }));
  server.get("/health/ready", { schema: healthSchemas.ready }, async (_request, reply) => {
    if (options.phase() !== "ready") return reply.code(503).send({ status: "not-ready" });
    return { status: "ready" };
  });
  return server;
}
