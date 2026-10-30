import assert from "node:assert/strict";
import { createAgent } from "@mozaik-ai/core";
import { createObservation, observationId, investigationId, requestInvestigation, updateSimulationAgent } from "../../domain/index.ts";
import type { InvestigationAssignmentCommitter } from "../../application/index.ts";
import { parseSemanticEvent } from "../../contracts/index.ts";
import type { SemanticEvent } from "../../contracts/index.ts";
import { encodeEvent } from "../event-bridge.ts";
import { investigationReaction } from "../investigation-reaction.ts";
import { sessionInvestigationStore } from "../investigation-store.ts";
import { ExplorationState } from "../state.ts";
import { scenario } from "../../../scripts/mozaik/scenario.ts";

export function reactionContext(maxTurns = 3) {
  const fixture = scenario();
  let simulation = updateSimulationAgent(fixture.simulation, fixture.beginner, { status: "running" });
  simulation = updateSimulationAgent(simulation, fixture.explorer, { status: "running" });
  const state = new ExplorationState(simulation);
  const store: InvestigationAssignmentCommitter = sessionInvestigationStore(state);
  for (const source of simulation.agents) {
    const participant = createAgent({ name: source.profile.name, instruction: "Explore", capabilities: [], tools: [], handlers: [] });
    state.agents.set(source.id, participant);
    state.domainIds.set(participant.getId(), source.id);
    state.turns.set(source.id, { turns: 0, busy: false, pending: [], inferenceCalls: 0, reservations: 0 });
  }
  const published: SemanticEvent[] = [];
  const started: string[] = [];
  const commit = store.commitAssignment;
  store.commitAssignment = async (event, revision) => {
    const result = await commit(event, revision);
    if (result === "saved") published.push(event);
    return result;
  };
  const handler = investigationReaction({ state, id: fixture.explorer, maxTurns, store,
    startTurn(_id, message) {
      const turn = state.turns.get(fixture.explorer);
      assert.ok(turn);
      turn.turns++;
      turn.busy = true;
      started.push(message);
      return true;
    },
  });
  function event(name = "investigation-one") {
    const observation = createObservation({
      id: observationId(`observation-${name}`), simulationId: simulation.id, agentId: fixture.beginner,
      description: "Item disappeared", observedAt: new Date(Date.now() - 1_000).toISOString(), context: { location: "/cart" }, evidenceIds: [],
    });
    const investigation = requestInvestigation({
      id: investigationId(name), simulationId: simulation.id, requestedBy: fixture.beginner,
      hypothesis: "Cart state may not persist.", requestedAt: observation.observedAt,
    }, [observation]);
    state.investigations.set(investigation.id, Object.freeze({ investigation, revision: 0 }));
    return encodeEvent(parseSemanticEvent({
      eventId: `event-${name}`, type: "investigation.requested", schemaVersion: 1,
      occurredAt: observation.observedAt, simulationId: simulation.id,
      origin: { kind: "agent", agentId: fixture.beginner }, correlationId: "original-correlation",
      payload: { investigation },
    }), state);
  }
  function apply(value: ReturnType<typeof event>) {
    const participant = state.agents.get(fixture.explorer);
    assert.ok(participant);
    handler.processor.apply({ event: value, participant });
  }
  return { state, store, published, started, event, apply, id: fixture.explorer };
}

export async function flush(state: ExplorationState): Promise<void> {
  for (let index = 0; index < 100 && state.pendingCallbacks; index++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(state.pendingCallbacks, 0, "Reaction callbacks must settle");
}
