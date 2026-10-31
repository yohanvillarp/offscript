import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { request, createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { agentId, simulationId } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
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
  assert.equal((await http(origin, "/api/target/check", { method: "POST", body: JSON.stringify({ url: "http://localhost:3000" }), headers: { "content-type": "application/json" } })).status, 401);
  assert.equal((await http(origin, "/api/target/check", { method: "POST", body: JSON.stringify({ url: "http://example.com" }), headers })).status, 400);
  assert.equal((await http(origin, "/api/target/check", { method: "POST", body: JSON.stringify({ url: origin }), headers })).status, 400);
  const application = createServer((_request, response) => { response.writeHead(503); response.end(); });
  await new Promise<void>(resolve => application.listen(0, "127.0.0.1", resolve));
  t.after(() => { application.closeAllConnections(); return new Promise<void>(resolve => application.close(() => resolve())); });
  const address = application.address(); assert.ok(address && typeof address !== "string");
  const targetUrl = `http://127.0.0.1:${address.port}/`;
  const checked = await http(origin, "/api/target/check", { method: "POST", headers, body: JSON.stringify({ url: targetUrl }) });
  assert.equal(checked.status, 200); assert.deepEqual(JSON.parse(checked.body), { url: targetUrl, kind: "response", statusCode: 503 });
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
  const deletePath = "/api/simulations/saved-http";
  const auth = { authorization: `Bearer ${restarted.credentials().token}` };
  assert.equal((await http(newOrigin, deletePath, { method: "DELETE" })).status, 401);
  assert.equal((await http(newOrigin, deletePath, { method: "DELETE", headers: { ...auth, origin: "https://evil.test" } })).status, 403);
  const deleted = await http(newOrigin, deletePath, { method: "DELETE", headers: auth });
  assert.equal(deleted.status, 204); assert.equal(deleted.body, "");
  assert.equal((await http(newOrigin, deletePath, { method: "DELETE", headers: auth })).status, 404);
  assert.deepEqual(JSON.parse((await http(newOrigin, "/api/simulations", { headers: auth })).body), []);
  const blockedId = simulationId("hosted-http");
  await restarted.configureSimulation({ simulationId: blockedId, setup: parseSimulationSetup(setup) });
  restarted.prepareSession(blockedId, () => ({ canAcceptEvent: () => false, publishEvent() {}, async close() {} }));
  assert.equal((await http(newOrigin, "/api/simulations/hosted-http", { method: "DELETE", headers: auth })).status, 409);
});

test("authenticated execution routes start, inspect, and stop controlled demo runs", async (t) => {
  const temp = hostContext(t);
  const host = temp.host({
    sessionFactory: () => ({
      startTurn() { return true; },
      async close() {},
      snapshot() { return { turns: [{ agentId: agentId("explorer"), count: 1 }] }; },
      canAcceptEvent() { return true; },
      publishEvent() {},
    }),
  });
  const origin = await host.start();
  const headers = { authorization: `Bearer ${host.credentials().token}`, "content-type": "application/json" };
  const id = "sim-exec-http";
  await host.configureSimulation({ simulationId: simulationId(id), setup: parseSimulationSetup(setup) });

  // Unauthenticated access rejected
  assert.equal((await http(origin, `/api/simulations/${id}/start`, { method: "POST", body: JSON.stringify({ mode: "controlled-demo" }), headers: { "content-type": "application/json" } })).status, 401);
  assert.equal((await http(origin, `/api/simulations/${id}/execution`)).status, 401);
  assert.equal((await http(origin, `/api/simulations/${id}/stop`, { method: "POST" })).status, 401);

  // Missing or invalid mode rejected
  assert.equal((await http(origin, `/api/simulations/${id}/start`, { method: "POST", headers, body: JSON.stringify({}) })).status, 400);
  assert.equal((await http(origin, `/api/simulations/${id}/start`, { method: "POST", headers, body: JSON.stringify({ mode: "real-browser" }) })).status, 400);

  // Inspect initially idle
  const idle = await http(origin, `/api/simulations/${id}/execution`, { headers });
  assert.equal(idle.status, 200);
  assert.equal(JSON.parse(idle.body).phase, "idle");

  // Start controlled demo
  const started = await http(origin, `/api/simulations/${id}/start`, { method: "POST", headers, body: JSON.stringify({ mode: "controlled-demo" }) });
  assert.equal(started.status, 200);
  assert.equal(JSON.parse(started.body).phase, "running");

  // Duplicate start rejected with 409
  const duplicate = await http(origin, `/api/simulations/${id}/start`, { method: "POST", headers, body: JSON.stringify({ mode: "controlled-demo" }) });
  assert.equal(duplicate.status, 409);

  // Inspect reflects running phase
  const inspected = await http(origin, `/api/simulations/${id}/execution`, { headers });
  assert.equal(inspected.status, 200);
  assert.equal(JSON.parse(inspected.body).phase, "running");

  // Stop simulation
  const stopped = await http(origin, `/api/simulations/${id}/stop`, { method: "POST", headers, body: JSON.stringify({}) });
  assert.equal(stopped.status, 200);
  assert.equal(JSON.parse(stopped.body).phase, "cancelled");
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
  // File navigation may omit Origin and retain cross-site metadata through 303.
  const fileHeaders = { "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "cross-site" };
  const withoutOrigin = (value: string) => http(origin, "/studio/session", { method: "POST", headers: fileHeaders, body: `entry=${value}` });
  assert.equal((await withoutOrigin("x".repeat(43))).status, 401);
  const nextEntry = host.studioEntry();
  const fileAccepted = await withoutOrigin(nextEntry.entry); assert.equal(fileAccepted.status, 303);
  assert.equal((await withoutOrigin(nextEntry.entry)).status, 401);
  assert.equal((await http(origin, "/", { headers: { "sec-fetch-site": "cross-site", origin: "null" } })).status, 200);
  assert.equal((await http(origin, "/assets/app.js", { headers: { "sec-fetch-site": "cross-site" } })).status, 200);
  assert.equal((await http(origin, "/api/project", { headers: { ...authorization, "sec-fetch-site": "cross-site" } })).status, 403);
});
