import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { createTargetProbe } from "../index.ts";

async function listen(t: TestContext, server: Server) {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}/`;
}

test("checks report HTTP errors/redirects without forwarding credentials, following redirects, or accepting remote targets", async t => {
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    assert.equal(request.headers.authorization, undefined); assert.equal(request.headers.cookie, undefined);
    response.writeHead(request.url === "/error" ? 503 : 302, { Location: "/error" }); response.end("not returned");
  });
  const url = await listen(t, server); const probe = createTargetProbe();
  assert.deepEqual(await probe.check(url), { url, kind: "response", statusCode: 302 });
  assert.equal(requests, 1);
  assert.deepEqual(await probe.check(url + "error"), { url: url + "error", kind: "response", statusCode: 503 });
  for (const target of ["http://example.com", "http://127.0.0.2", "http://user:secret@localhost", "file:///tmp/app"]) {
    await assert.rejects(probe.check(target));
  }
  assert.equal(requests, 2);
});

test("checks have bounded concurrency, support cancellation, and release slots after timeout", async t => {
  const url = await listen(t, createServer(() => {})); const probe = createTargetProbe();
  const abort = new AbortController();
  const first = probe.check(url, abort.signal); const rejection = assert.rejects(first);
  const second = probe.check(url);
  assert.deepEqual(await probe.check(url), { url, kind: "busy" });
  abort.abort(); await rejection;
  assert.deepEqual(await second, { url, kind: "timeout" });
  const afterTimeout = new AbortController();
  const resumed = probe.check(url, afterTimeout.signal); const resumedRejection = assert.rejects(resumed);
  afterTimeout.abort(); await resumedRejection;
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(probe.check(url, cancelled.signal));
});
