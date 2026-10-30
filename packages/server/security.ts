import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

export type AccessOptions = Readonly<{
  token: string;
  port: () => number | undefined;
  allowedOrigins: readonly string[];
}>;

export function secureLocalAccess(server: FastifyInstance, options: AccessOptions): void {
  const digest = (text: string) => createHash("sha256").update(text).digest();
  const expected = digest(options.token);
  const allowed = new Set(options.allowedOrigins);
  server.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    const port = options.port();
    const authority = port === 80 ? "" : `:${port}`;
    const hosts = new Set([`127.0.0.1${authority}`, `localhost${authority}`]);
    if (port === undefined || !hosts.has(request.headers.host ?? "")) {
      return reply.code(403).send({ error: "HOST_NOT_ALLOWED" });
    }
    const origin = request.headers.origin;
    if ((origin !== undefined && !allowed.has(origin) && origin !== `http://${request.headers.host}`) ||
        (origin === undefined && request.headers["sec-fetch-site"] === "cross-site")) {
      return reply.code(403).send({ error: "ORIGIN_NOT_ALLOWED" });
    }
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/i)?.[1];
    if (!token || !timingSafeEqual(expected, digest(token))) {
      reply.header("WWW-Authenticate", "Bearer");
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  });
}
