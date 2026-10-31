import { randomUUID } from "node:crypto";
import type { Tool } from "@mozaik-ai/core";
import { createObservation, evidenceId, investigationId, observationId } from "../../domain/index.ts";
import type { AgentId } from "../../domain/index.ts";
import { parseSemanticEvent } from "../../contracts/index.ts";
import type { SemanticEvent } from "../../contracts/index.ts";
import { executeCompleteInvestigation, executeRequestInvestigation } from "../../application/index.ts";
import { sessionStorage } from "../session-storage.ts";
import type { ExplorationStorage } from "../session-storage.ts";
import type { ExplorationState, ToolName } from "../state.ts";
import { argumentsObject, argumentText } from "./arguments.ts";
import type { BrowserUserSession } from "../../browser/index.ts";

export function browserExplorationTools(
  state: ExplorationState,
  id: AgentId,
  browserSession: BrowserUserSession,
  publish: (event: SemanticEvent) => void,
  storage: ExplorationStorage = sessionStorage(state),
): Tool[] {
  function tool(
    name: ToolName,
    description: string,
    properties: Record<string, unknown>,
    invoke: (args: unknown) => Promise<unknown>,
  ): Tool {
    return {
      type: "function",
      name,
      description,
      strict: true,
      parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
      async invoke(args: unknown) {
        try {
          if (state.closed || !state.permissions.get(id)?.has(name)) {
            throw new Error("Tool action is not allowed in this session.");
          }
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
    tool(
      "browser_navigate",
      "Navigate to an authorized URL or path in the target web application.",
      { url: text },
      async (value) => {
        const args = argumentsObject(value, ["url"]);
        const url = argumentText(args.url);
        const result = await browserSession.navigate(url);
        if (!result.success) throw new Error(result.error || "Navigation failed.");
        return { currentUrl: result.url };
      },
    ),
    tool(
      "browser_inspect",
      "Inspect current page DOM and accessibility tree, returning visible text, title, and interactive element handles.",
      {},
      async () => {
        const snapshot = await browserSession.inspect();
        return {
          url: snapshot.url,
          title: snapshot.title,
          textSummary: snapshot.textSummary,
          ariaSnapshot: snapshot.ariaSnapshot,
          elements: snapshot.elements.map((el) => ({
            ref: el.ref,
            role: el.role,
            name: el.name,
            text: el.text,
            disabled: el.disabled,
            ...(el.type ? { type: el.type } : {}),
            ...(el.placeholder ? { placeholder: el.placeholder } : {}),
            ...(el.checked !== undefined ? { checked: el.checked } : {}),
            ...(el.expanded !== undefined ? { expanded: el.expanded } : {}),
          })),
        };
      },
    ),
    tool(
      "browser_click",
      "Click an interactive element on the current page using its opaque reference (e.g. elem_1).",
      { ref: text },
      async (value) => {
        const args = argumentsObject(value, ["ref"]);
        const ref = argumentText(args.ref);
        const result = await browserSession.click(ref);
        if (!result.success) throw new Error(result.error || "Click failed.");
        return { currentUrl: result.url };
      },
    ),
    tool(
      "browser_type",
      "Type text into an input or editable element using its opaque reference.",
      { ref: text, text: { type: "string" } },
      async (value) => {
        const args = argumentsObject(value, ["ref", "text"]);
        const ref = argumentText(args.ref);
        const inputContent = typeof args.text === "string" ? args.text : "";
        const result = await browserSession.type(ref, inputContent);
        if (!result.success) throw new Error(result.error || "Type failed.");
        return { currentUrl: result.url };
      },
    ),
    tool(
      "record_observation",
      "Record noticed behavior or unexpected findings as untrusted observation data, without confirming a defect.",
      { description: text, location: text },
      async (value) => {
        const args = argumentsObject(value, ["description", "location"]);
        const desc = argumentText(args.description);
        const loc = argumentText(args.location);
        for (const existing of state.observations.values()) {
          if (existing.simulationId === state.simulation.id && existing.agentId === id &&
              existing.description === desc && existing.context.location === loc) {
            return { observationId: existing.id, evidenceId: existing.evidenceIds[0] ?? "" };
          }
        }
        const eid = evidenceId(`ev-${randomUUID()}`);
        const observation = createObservation({
          id: observationId(randomUUID()),
          simulationId: state.simulation.id,
          agentId: id,
          observedAt: new Date().toISOString(),
          description: desc,
          context: { location: loc },
          evidenceIds: [eid],
        });
        if ((await storage.observations.createObservation(observation)) !== "created") {
          throw new Error("Observation identity already exists.");
        }
        state.observations.set(observation.id, observation);
        publish(
          parseSemanticEvent({
            eventId: randomUUID(),
            type: "observation.created",
            schemaVersion: 1,
            occurredAt: observation.observedAt,
            simulationId: state.simulation.id,
            origin: { kind: "agent", agentId: id },
            correlationId: state.simulation.id,
            payload: { observation },
          }),
        );
        return { observationId: observation.id, evidenceId: eid };
      },
    ),
    tool(
      "request_investigation",
      "Request collaborative examination of existing observations, without assigning or confirming findings.",
      { hypothesis: text, observationIds: { type: "array", items: text, minItems: 1, uniqueItems: true } },
      async (value) => {
        const args = argumentsObject(value, ["hypothesis", "observationIds"]);
        if (!Array.isArray(args.observationIds)) throw new Error("Expected observation identities.");
        const references = Array.from(args.observationIds, (entry: unknown) =>
          observationId(argumentText(entry)),
        );
        const result = await executeRequestInvestigation(
          {
            investigationId: investigationId(randomUUID()),
            simulationId: state.simulation.id,
            requestedBy: id,
            observationIds: references,
            hypothesis: argumentText(args.hypothesis),
            requestedAt: new Date().toISOString(),
            eventId: randomUUID(),
            correlationId: state.simulation.id,
          },
          {
            simulations: {
              async findSimulation(key) {
                return key === state.simulation.id ? state.simulation : undefined;
              },
            },
            observations: storage.observations,
            investigations: storage.investigations,
          },
        );
        return { investigationId: result.investigation.id, publication: result.publication.status };
      },
    ),
    tool(
      "complete_investigation",
      "Record an assessment outcome for an assigned investigation with explanation and evidence references.",
      {
        investigationId: text,
        outcome: { type: "string", enum: ["supported", "contradicted", "inconclusive"] },
        explanation: text,
        evidenceIds: { type: "array", items: text },
      },
      async (value) => {
        const args = argumentsObject(value, ["investigationId", "outcome", "explanation", "evidenceIds"]);
        if (args.outcome !== "supported" && args.outcome !== "contradicted" && args.outcome !== "inconclusive") {
          throw new Error("Invalid investigation outcome.");
        }
        const evidence = Array.isArray(args.evidenceIds)
          ? args.evidenceIds.map((item: unknown) => argumentText(item))
          : [];
        const result = await executeCompleteInvestigation(
          {
            investigationId: investigationId(argumentText(args.investigationId)),
            simulationId: state.simulation.id,
            completedBy: id,
            result: {
              outcome: args.outcome,
              explanation: argumentText(args.explanation),
              evidenceIds: evidence.map(evidenceId),
            },
            origin: { kind: "agent", agentId: id },
            completedAt: new Date().toISOString(),
            eventId: randomUUID(),
            correlationId: state.simulation.id,
          },
          {
            simulations: {
              async findSimulation(key) {
                return key === state.simulation.id ? state.simulation : undefined;
              },
            },
            investigations: storage.investigations,
          },
        );
        return {
          investigationId: result.investigation.id,
          outcome: result.investigation.lifecycle.result.outcome,
          status: result.investigation.lifecycle.status,
        };
      },
    ),
  ];
  return tools.filter((entry) => state.permissions.get(id)?.has(entry.name as ToolName));
}
