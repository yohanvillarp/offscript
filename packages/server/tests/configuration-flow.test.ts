import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { hostContext } from "../../runtime/tests/host-context.ts";

function http(origin: string, path: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}) {
  return new Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }>((resolve, reject) => {
    const pending = request(origin + path, { method: options.method ?? "GET", headers: options.headers ?? {} }, response => {
      let body = ""; response.setEncoding("utf8"); response.on("data", (chunk: string) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body, headers: response.headers }));
    });
    pending.on("error", reject); pending.end(options.body);
  });
}
const setup = { name: "Checkout", targetUrl: "http://localhost:3000", environment: { kind: "web", deployment: "local" },
  goal: "Find a product.", userProfileIds: ["explorer", "beginner"] };

test("authenticated HTTP creation/read/list persist setup without starting agents or accepting a client project path", async t => {
  const temp = hostContext(t); writeFileSync(join(temp.root, "package.json"), JSON.stringify({ name: "local-checkout" }));
  const host = temp.host(); const origin = await host.start(); const headers = { authorization: `Bearer ${host.credentials().token}`, "content-type": "application/json" };
  assert.equal((await http(origin, "/api/project")).status, 401);
  const project = await http(origin, "/api/project", { headers }); assert.equal(JSON.parse(project.body).suggestedName, "local-checkout");
  const body = JSON.stringify({ simulationId: "saved-http", setup });
  const created = await http(origin, "/api/simulations", { method: "POST", headers, body });
  assert.equal(created.status, 201); const configuration: unknown = JSON.parse(created.body);
  const duplicate = await http(origin, "/api/simulations", { method: "POST", headers, body }); assert.equal(duplicate.status, 409);
  const read = await http(origin, "/api/simulations/saved-http", { headers }); assert.deepEqual(JSON.parse(read.body), configuration);
  assert.deepEqual(JSON.parse((await http(origin, "/api/simulations", { headers })).body), [configuration]);
  assert.equal((await http(origin, "/api/simulations/missing", { headers })).status, 404);
  assert.equal((await http(origin, "/api/simulations", { method: "POST", headers,
    body: JSON.stringify({ simulationId: "bad", setup, projectRoot: "other-directory" }) })).status, 400);
  const invalid = await http(origin, "/api/simulations", { method: "POST", headers,
    body: JSON.stringify({ simulationId: "bad", setup: { ...setup, userProfileIds: ["raven"] } }) });
  assert.equal(invalid.status, 400); assert.equal(JSON.parse(invalid.body).field, "setup.userProfileIds");
  const db = temp.open(); assert.equal((await db.simulations.findSimulation(simulationId("saved-http")))?.lifecycle.status, "created");
  assert.equal(await db.outbox.hasPending("saved-http"), false);
  await host.close();
  const restarted = temp.host(); const newOrigin = await restarted.start();
  const saved = await http(newOrigin, "/api/simulations/saved-http", { headers: { authorization: `Bearer ${restarted.credentials().token}` } });
  assert.deepEqual(JSON.parse(saved.body), configuration);
});

test("local-file entry uses a one-time body credential and an HttpOnly API cookie; public assets expose no project files", async t => {
  const temp = hostContext(t); const assets = join(temp.root, "studio-build"); mkdirSync(join(assets, "assets"), { recursive: true });
  writeFileSync(join(assets, "index.html"), "<html><title>Studio</title></html>"); writeFileSync(join(assets, "assets", "app.js"), "console.log('studio')");
  writeFileSync(join(temp.root, ".env"), "PRIVATE_SECRET=not-served");
  const host = temp.host({ studioDirectory: assets }); const origin = await host.start();
  assert.equal((await http(origin, "/")).status, 200);
  assert.equal((await http(origin, "/assets/app.js")).status, 200);
  assert.notEqual((await http(origin, "/assets/..%2f..%2f.env")).status, 200);
  const entry = host.studioEntry();
  const exchange = (value: string, originHeader = "null") => http(origin, "/studio/session", { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: originHeader }, body: `entry=${value}` });
  assert.equal((await exchange(entry.entry, "https://evil.test")).status, 403);
  const rejected = await exchange("x".repeat(43)); assert.equal(rejected.status, 401); assert.equal(rejected.headers["set-cookie"], undefined);
  const accepted = await exchange(entry.entry); assert.equal(accepted.status, 303); assert.equal(accepted.headers.location, "/");
  assert.ok(!accepted.body.includes(entry.entry));
  const cookies = accepted.headers["set-cookie"]; assert.ok(Array.isArray(cookies)); const cookie = cookies[0]; assert.ok(cookie);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\/api/);
  const authorization = { cookie: cookie.split(";")[0] ?? "", "x-offscript-client": "studio" };
  assert.equal((await http(origin, "/api/project", { headers: authorization })).status, 200);
  assert.equal((await http(origin, "/api/project", { headers: { cookie: authorization.cookie } })).status, 401);
  assert.equal((await http(origin, "/api/project", { headers: { ...authorization, origin: "https://evil.test" } })).status, 403);
  assert.equal((await exchange(entry.entry)).status, 401);
  assert.equal((await http(origin, "/health/ready", { headers: authorization })).status, 401);
});
