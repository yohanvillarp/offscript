import assert from "node:assert/strict";
import { test } from "node:test";
import { createAgent, SemanticEvent as MozaikEvent } from "@mozaik-ai/core";
import { createObservation, observationId, updateSimulationAgent } from "../../domain/index.ts";
import { parseSemanticEvent } from "../../contracts/index.ts";
import type { SemanticEvent } from "../../contracts/index.ts";
import { decodeEvent, encodeEvent, offscriptEventType } from "../event-bridge.ts";
import { ExplorationState } from "../state.ts";
import { explorationTools } from "../tools/exploration-tools.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";

function state() {
  const fixture = scenario();
  const result = new ExplorationState(updateSimulationAgent(fixture.simulation, fixture.beginner, { status: "running" }));
  result.systemId = "session-system";
  result.permissions.set(fixture.beginner, new Set(["inspect_application", "record_observation", "request_investigation"]));
  const participant = createAgent({ name: "User", instruction: "Explore", capabilities: [], tools: [], handlers: [] });
  result.agents.set(fixture.beginner, participant);
  result.domainIds.set(participant.getId(), fixture.beginner);
  return { state: result, id: fixture.beginner };
}

function observationEvent(): SemanticEvent {
  const fixture = scenario();
  const observation = createObservation({
    id: observationId("one"), simulationId: fixture.simulation.id, agentId: fixture.beginner,
    description: "Behavior noticed.", observedAt: "2026-10-30T12:00:00.000Z", context: { location: "/cart" }, evidenceIds: [],
  });
  return parseSemanticEvent({
    eventId: "one", type: "observation.created", schemaVersion: 1, occurredAt: observation.observedAt,
    simulationId: fixture.simulation.id, origin: { kind: "agent", agentId: fixture.beginner }, correlationId: "correlation-one",
    payload: { observation },
  });
}

test("bridge preserves the full OFFSCRIPT envelope while mapping the runtime producer", () => {
  const fixture = state();
  const original = observationEvent();
  const encoded = encodeEvent(original, fixture.state);
  assert.equal(encoded.type, offscriptEventType);
  assert.notEqual(encoded.producerId, fixture.id);
  assert.deepEqual(decodeEvent(encoded, fixture.state), original);
  const system = { ...original, origin: { kind: "system" as const } };
  assert.equal(encodeEvent(system, fixture.state).producerId, "session-system");
});

test("bridge rejects producer spoofing, timestamp drift, foreign simulation and unknown origin", () => {
  const fixture = state();
  const encoded = encodeEvent(observationEvent(), fixture.state);
  assert.throws(() => decodeEvent(new MozaikEvent(encoded.type, "spoofed", encoded.occurredAt, encoded.payload), fixture.state), /producer/);
  assert.throws(() => decodeEvent(new MozaikEvent(encoded.type, encoded.producerId, new Date(), encoded.payload), fixture.state), /timestamp/);
  const foreign = state();
  foreign.state.simulation = { ...foreign.state.simulation, id: scenario("foreign").simulation.id };
  assert.throws(() => decodeEvent(encoded, foreign.state), /another simulation/);
  fixture.state.agents.clear();
  assert.throws(() => decodeEvent(encoded, fixture.state), /not mapped/);
});

test("tool authorization comes from session permissions, not model arguments or capabilities", async () => {
  const fixture = state();
  const events: SemanticEvent[] = [];
  const tools = explorationTools(fixture.state, fixture.id, (event) => events.push(event));
  const record = tools.find((tool) => tool.name === "record_observation");
  assert.ok(record);
  const rejected: unknown = await record.invoke({ description: "Data", location: "/cart", agentId: "spoofed" });
  assert.ok(rejected && typeof rejected === "object" && "error" in rejected);
  assert.equal(events.length, 0);
  assert.equal(fixture.state.observations.size, 0);
  await record.invoke({ description: "Observed behavior", location: "/cart" });
  assert.equal(events[0]?.origin.kind, "agent");
  const first = events[0];
  if (first?.origin.kind === "agent") assert.equal(first.origin.agentId, fixture.id);
  fixture.state.permissions.set(fixture.id, new Set());
  assert.equal(explorationTools(fixture.state, fixture.id, () => {}).length, 0);
  await record.invoke({ description: "Stale permission", location: "/cart" });
  assert.equal(events.length, 1);
  assert.ok(fixture.state.failures.some((failure) => failure.stage === "tool:record_observation"));
});

test("request tool invokes the application case and cannot cross simulation scope", async () => {
  const fixture = state();
  const published: SemanticEvent[] = [];
  const tools = explorationTools(fixture.state, fixture.id, (event) => published.push(event));
  const record = tools.find((tool) => tool.name === "record_observation");
  const request = tools.find((tool) => tool.name === "request_investigation");
  assert.ok(record && request);
  await record.invoke({ description: "Data", location: "/cart" });
  const observation = [...fixture.state.observations.values()][0];
  assert.ok(observation);
  await request.invoke({ hypothesis: "A hypothesis", observationIds: [observation.id] });
  assert.equal(fixture.state.investigations.size, 1);
  assert.equal(published[1]?.type, "investigation.requested");
  await request.invoke({ hypothesis: "Foreign reference", observationIds: ["foreign"] });
  await request.invoke({ hypothesis: "Duplicate reference", observationIds: [observation.id, observation.id] });
  assert.equal(fixture.state.investigations.size, 1);
  fixture.state.closed = true;
  await record.invoke({ description: "Late", location: "/cart" });
  assert.equal(fixture.state.observations.size, 1);
});

test("tool arguments reject malformed shapes and unsupported inspection phases", async () => {
  const fixture = state();
  const tools = explorationTools(fixture.state, fixture.id, () => {});
  const inspect = tools.find((tool) => tool.name === "inspect_application");
  assert.ok(inspect);
  for (const value of [null, [], "invalid", {}, { phase: "outside" }, { phase: "before_reload", url: "https://external.test" }]) {
    const result: unknown = await inspect.invoke(value);
    assert.ok(result && typeof result === "object" && "error" in result);
  }
  assert.deepEqual(await inspect.invoke({ phase: "before_reload" }), { location: "/cart", itemCount: 1, source: "simulated-fixture" });
  assert.deepEqual(await inspect.invoke({ phase: "after_reload" }), { location: "/cart", itemCount: 0, source: "simulated-fixture" });
});
