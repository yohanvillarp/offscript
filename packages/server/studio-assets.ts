import send from "@fastify/send";
import { statSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { StudioSession } from "./studio-session.ts";

export function publicStudioPath(method: string, pathname: string): boolean {
  return method === "GET" && (["/", "/simulations/new", "/favicon.svg"].includes(pathname) ||
    ["/assets/", "/participants/", "/brand/"].some(prefix => pathname.startsWith(prefix)));
}

export function studioAssets(server: FastifyInstance, root: string, session: StudioSession): void {
  if (!statSync(join(root, "index.html")).isFile()) throw new Error("Build Studio before starting its host.");
  async function file(request: FastifyRequest, reply: FastifyReply, path: string) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const asset = await send(request.raw, encodedPath, { root, dotfiles: "deny", cacheControl: false, index: false });
    if (asset.type !== "file") {
      asset.stream.destroy();
      const status = asset.statusCode >= 500 ? 500 : 404;
      return reply.code(status).send({ error: status === 500 ? "INTERNAL_ERROR" : "NOT_FOUND" });
    }
    return reply.code(asset.statusCode).headers(asset.headers).send(asset.stream);
  }
  for (const path of ["/", "/simulations/new"]) server.get(path, (request, reply) => file(request, reply, "index.html"));
  server.get("/favicon.svg", (request, reply) => file(request, reply, "favicon.svg"));
  for (const prefix of ["assets", "participants", "brand"]) {
    server.get<{ Params: { "*": string } }>(`/${prefix}/*`, (request, reply) => {
      const path = request.params["*"];
      if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) return reply.code(404).send({ error: "NOT_FOUND" });
      return file(request, reply, `${prefix}/${path}`);
    });
  }
  server.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => {
    const fields = new URLSearchParams(String(body));
    done(null, fields.getAll("entry").length === 1 ? { entry: fields.get("entry") } : {});
  });
  server.post("/studio/session", async (request, reply) => {
    const body = request.body;
    const token = session.exchange(body && typeof body === "object" && "entry" in body ? body.entry : undefined);
    if (!token) return reply.code(401).send({ error: "UNAUTHORIZED" });
    reply.header("Set-Cookie", `offscript_session=${token}; HttpOnly; SameSite=Strict; Path=/api`);
    return reply.code(303).header("Location", "/").send();
  });
}
