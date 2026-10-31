import assert from "node:assert/strict";
import { test } from "node:test";
import { simulationId } from "../../domain/index.ts";
import { parseSimulationSetup } from "../../contracts/index.ts";
import { hostContext } from "./host-context.ts";

test("host configuration services use the selected project and only persist created simulations", async t => {
  const temp = hostContext(t); const host = temp.host(); await host.start();
  const project = await host.inspectProject();
  const id = simulationId("host-configured");
  const result = await host.configureSimulation({ simulationId: id, setup: parseSimulationSetup({
    targetUrl: "http://localhost:3000", environment: { kind: "web", deployment: "local" },
    goal: "Complete a task.", userProfileIds: ["beginner"],
  }) });
  assert.equal(result.configuration.projectRoot, project.rootPath);
  assert.equal(result.configuration.name, project.suggestedName);
  assert.equal(result.simulation.lifecycle.status, "created");
  assert.deepEqual(await host.findConfiguration(id), result.configuration);
  assert.equal(await temp.open().outbox.hasPending(id), false);
  await host.close();
  await assert.rejects(host.findConfiguration(id), /not accepting/);
});
