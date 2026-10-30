import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { hostContext, eventually } from "./host-context.ts";

test("incompatible migrations abort startup without replacing an unmanaged database", async t => {
  const temp = hostContext(t); const raw = temp.raw();
  raw.client.exec("CREATE TABLE simulations (legacy TEXT); INSERT INTO simulations VALUES ('preserved');");
  const host = temp.host(); await assert.rejects(host.start(), /startup failed/);
  assert.equal(host.phase(), "stopped");
  assert.deepEqual(raw.client.prepare("SELECT legacy FROM simulations").all(), [{ legacy: "preserved" }]);
  await host.close(); assert.equal(host.phase(), "stopped");
});

test("outbox storage failures make the host unready and emit only fixed diagnostics", async t => {
  const temp = hostContext(t); const diagnostics: string[] = [];
  const host = temp.host({ onDiagnostic: code => diagnostics.push(code) }); await host.start();
  temp.raw().client.exec("DROP TABLE event_outbox");
  await eventually(() => host.phase() === "failed");
  assert.ok(diagnostics.length >= 1); assert.ok(diagnostics.every(code => code === "OUTBOX_FAILED"));
  assert.throws(() => host.prepareSession(simulationId("new-session"), () => { throw new Error("Must not create"); }), /not accepting/);
  await host.close(); assert.equal(host.phase(), "stopped");
});

test("one session's shutdown rejection does not skip other sessions or storage cleanup", async t => {
  const temp = hostContext(t); const host = temp.host(); await host.start();
  let closed = 0;
  host.prepareSession(simulationId("broken"), () => ({ canAcceptEvent: () => false, publishEvent() {},
    async close() { throw new Error("Session closure rejected"); } }));
  host.prepareSession(simulationId("other"), () => ({ canAcceptEvent: () => false, publishEvent() {},
    async close() { closed++; } }));
  await assert.rejects(host.close(), /cleanup failed/);
  assert.equal(closed, 1); assert.equal(host.phase(), "stopped");
  const reopened = temp.open(); reopened.migrate();
});

test("shutdown timeout reports uncertainty and lets cleanup finish without closing storage early", async t => {
  const temp = hostContext(t); const host = temp.host({ shutdownTimeoutMs: 10 }); await host.start();
  let release: (() => void) | undefined;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const session = host.prepareSession(simulationId("slow-session"), context => ({
    canAcceptEvent: () => false, publishEvent() {}, async close() { await blocked; }, storage: context.storage,
  }));
  const pending = host.close();
  try {
    await assert.rejects(pending, /timed out/);
    assert.equal(host.phase(), "stopping");
    // The connection stays usable until its owner finishes closing the session.
    assert.equal(await session.storage.outbox.hasPending("slow-session"), false);
  } finally { release?.(); await eventually(() => host.phase() === "stopped"); }
  await assert.rejects(session.storage.outbox.hasPending("slow-session"), /closed to new operations/);
});
