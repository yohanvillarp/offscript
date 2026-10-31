import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentId, simulationId } from "../../domain/index.ts";
import type { Observation } from "../../domain/index.ts";
import { createBrowserManager } from "../browser-manager.ts";
import type { BrowserManager } from "../browser-manager.ts";
import { createBrowserTools } from "../tools/browser-tools.ts";
import { startTestServer } from "./test-server.ts";
import type { TestServerHandle } from "./test-server.ts";

describe("browser tools integration", () => {
  let server: TestServerHandle;
  let manager: BrowserManager;

  before(async () => {
    server = await startTestServer();
    manager = createBrowserManager({ headless: true });
  });

  after(async () => {
    await manager.close();
    await server.close();
  });

  it("exposes bounded tools and captures attributable observations", async () => {
    const simId = simulationId("sim_test_1");
    const actingAgentId = agentId("fox_agent");
    const recordedObservations: Observation[] = [];

    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      const tools = createBrowserTools(session, actingAgentId, simId, (obs) => {
        recordedObservations.push(obs);
      });

      const toolMap = new Map(tools.map((t) => [t.name, t]));

      // 1. Navigate
      const navigateTool = toolMap.get("browser_navigate");
      assert.ok(navigateTool);
      const navRes = (await navigateTool.invoke({ url: "/" })) as { currentUrl: string };
      assert.match(navRes.currentUrl, new RegExp(`^${server.origin}/?`));

      // 2. Inspect
      const inspectTool = toolMap.get("browser_inspect");
      assert.ok(inspectTool);
      const inspectRes = (await inspectTool.invoke({})) as {
        url: string;
        title: string;
        elements: Array<{ ref: string; name: string }>;
      };
      assert.equal(inspectRes.title, "Explore Shop");
      assert.ok(inspectRes.elements.length > 0);

      // 3. Click
      const clickTool = toolMap.get("browser_click");
      assert.ok(clickTool);
      const targetEl = inspectRes.elements.find((el) => el.name.includes("Add Product"));
      assert.ok(targetEl);
      const clickRes = (await clickTool.invoke({ ref: targetEl.ref })) as { success: boolean };
      assert.equal(clickRes.success, true);

      // 4. Type
      const typeTool = toolMap.get("browser_type");
      assert.ok(typeTool);
      const inputEl = inspectRes.elements.find((el) => el.name.includes("Search query"));
      assert.ok(inputEl);
      const typeRes = (await typeTool.invoke({ ref: inputEl.ref, text: "mechanical keyboard" })) as {
        success: boolean;
      };
      assert.equal(typeRes.success, true);

      // 5. Record observation
      const recordTool = toolMap.get("browser_record_observation");
      assert.ok(recordTool);
      const obsRes = (await recordTool.invoke({
        description: "The product added message appeared after clicking Add Product.",
      })) as { observationId: string; location: string };

      assert.ok(obsRes.observationId);
      assert.match(obsRes.location, new RegExp(`^${server.origin}`));

      assert.equal(recordedObservations.length, 1);
      const obs = recordedObservations[0]!;
      assert.equal(obs.simulationId, simId);
      assert.equal(obs.agentId, actingAgentId);
      assert.equal(obs.description, "The product added message appeared after clicking Add Product.");
      assert.match(obs.context.location, new RegExp(`^${server.origin}`));
    } finally {
      await session.close();
    }
  });

  it("rejects unauthorized navigation via tool invocation", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      const tools = createBrowserTools(session, agentId("user_1"), simulationId("sim_1"));
      const navigateTool = tools.find((t) => t.name === "browser_navigate");
      assert.ok(navigateTool);

      const result = (await navigateTool.invoke({ url: "https://unauthorized-domain.com" })) as {
        error?: string;
      };
      assert.ok(result.error);
      assert.match(result.error, /out of authorized target scope/);
    } finally {
      await session.close();
    }
  });
});
