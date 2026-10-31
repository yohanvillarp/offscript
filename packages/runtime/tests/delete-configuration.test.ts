import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { hostContext } from "./host-context.ts";

const setup = parseSimulationSetup({ targetUrl: "http://localhost:3000", goal: "Find a product.",
  userProfileIds: ["explorer"], environment: { kind: "web", deployment: "local" } });
const session = () => ({ canAcceptEvent: () => false, publishEvent() {}, async close() {} });

test("host blocks deletion for registered/preparing sessions and blocks session registration while deletion is admitted", async t => {
  const temp = hostContext(t); const host = temp.host(); await host.start();
  const hosted = simulationId("hosted"); await host.configureSimulation({ simulationId: hosted, setup });
  let whilePreparing: Promise<unknown> | undefined;
  host.prepareSession(hosted, () => { whilePreparing = host.deleteConfiguration(hosted); return session(); });
  assert.equal(await whilePreparing, "not-allowed");
  assert.equal(await host.deleteConfiguration(hosted), "not-allowed");
  assert.ok(await host.findConfiguration(hosted));
  const removable = simulationId("removable"); await host.configureSimulation({ simulationId: removable, setup });
  const deletion = host.deleteConfiguration(removable);
  assert.throws(() => host.prepareSession(removable, session), /deletion is in progress/);
  assert.equal(await host.deleteConfiguration(removable), "not-allowed");
  assert.equal(await deletion, "deleted");
  assert.equal(await host.findConfiguration(removable), undefined);
});
