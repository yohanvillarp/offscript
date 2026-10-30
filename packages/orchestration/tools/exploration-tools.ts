import { randomUUID } from "node:crypto";
import type { Tool } from "@mozaik-ai/core";
import { createObservation, investigationId, observationId } from "../../domain/index.ts";
import type { AgentId } from "../../domain/index.ts";
import { parseSemanticEvent } from "../../contracts/index.ts";
import type { SemanticEvent } from "../../contracts/index.ts";
import { executeRequestInvestigation } from "../../application/index.ts";
import { sessionInvestigationStore } from "../investigation-store.ts";
import type { ExplorationState, ToolName } from "../state.ts";
import { argumentsObject, argumentText } from "./arguments.ts";

export function explorationTools(
  state: ExplorationState, id: AgentId, publish: (event: SemanticEvent) => void,
): Tool[] {
  function tool(name: ToolName, description: string, properties: Record<string, unknown>, invoke: (args: unknown) => Promise<unknown>): Tool {
    return {
      type: "function", name, description, strict: true,
      parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
      async invoke(args: unknown) {
        try {
          if (state.closed || !state.permissions.get(id)?.has(name)) throw new Error("Tool action is not allowed in this session.");
          return await invoke(args);
        } catch (cause) {
          state.fail(`tool:${name}`, id, cause);
          return { error: "Tool action rejected or failed. No permission was granted by this response." };
        }
      },
    };
  }
  const text = { type: "string", minLength: 1 };
  const tools = [
    tool("inspect_application", "Inspect the local simulated cart before or after reload. This is not a real browser.", {
      phase: { type: "string", enum: ["before_reload", "after_reload"] },
    }, async (value) => {
      const args = argumentsObject(value, ["phase"]);
      if (args.phase !== "before_reload" && args.phase !== "after_reload") throw new Error("Unknown inspection phase.");
      return { location: "/cart", itemCount: args.phase === "before_reload" ? 1 : 0, source: "simulated-fixture" };
    }),
    tool("record_observation", "Record noticed behavior as untrusted observation data, without confirming a defect.", {
      description: text, location: text,
    }, async (value) => {
      const args = argumentsObject(value, ["description", "location"]);
      const observation = createObservation({
        id: observationId(randomUUID()), simulationId: state.simulation.id, agentId: id,
        observedAt: new Date().toISOString(), description: argumentText(args.description),
        context: { location: argumentText(args.location) }, evidenceIds: [],
      });
      state.observations.set(observation.id, observation);
      publish(parseSemanticEvent({
        eventId: randomUUID(), type: "observation.created", schemaVersion: 1, occurredAt: observation.observedAt,
        simulationId: state.simulation.id, origin: { kind: "agent", agentId: id },
        correlationId: state.simulation.id, payload: { observation },
      }));
      return { observationId: observation.id };
    }),
    tool("request_investigation", "Request collaborative examination of existing observations, without assigning or confirming findings.", {
      hypothesis: text, observationIds: { type: "array", items: text, minItems: 1, uniqueItems: true },
    }, async (value) => {
      const args = argumentsObject(value, ["hypothesis", "observationIds"]);
      if (!Array.isArray(args.observationIds)) throw new Error("Expected observation identities.");
      const references = Array.from(args.observationIds, (entry: unknown) => observationId(argumentText(entry)));
      const result = await executeRequestInvestigation({
        investigationId: investigationId(randomUUID()), simulationId: state.simulation.id, requestedBy: id,
        observationIds: references, hypothesis: argumentText(args.hypothesis), requestedAt: new Date().toISOString(),
        eventId: randomUUID(), correlationId: state.simulation.id,
      }, {
        simulations: { async findSimulation(key) { return key === state.simulation.id ? state.simulation : undefined; } },
        observations: { async findObservation(key) { return state.observations.get(key); } },
        investigations: sessionInvestigationStore(state),
        events: { async publishInvestigationRequested(event) { publish(event); } },
      });
      return { investigationId: result.investigation.id, publication: result.publication.status };
    }),
  ];
  return tools.filter((entry) => state.permissions.get(id)?.has(entry.name as ToolName));
}
