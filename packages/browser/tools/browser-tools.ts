import { randomUUID } from "node:crypto";
import { createObservation, observationId } from "../../domain/index.ts";
import type { AgentId, Observation, SimulationId } from "../../domain/index.ts";
import type { BrowserUserSession } from "../session.ts";

export type BrowserToolAction =
  | "browser_navigate"
  | "browser_inspect"
  | "browser_click"
  | "browser_type"
  | "browser_scroll"
  | "browser_select"
  | "browser_record_observation";

export type BrowserToolDefinition = Readonly<{
  name: BrowserToolAction;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: readonly string[];
    additionalProperties: false;
  };
  invoke: (args: unknown) => Promise<unknown>;
}>;

function asObject(val: unknown, expectedKeys: readonly string[]): Record<string, unknown> {
  if (!val || typeof val !== "object" || Array.isArray(val)) {
    throw new Error("Tool arguments must be an object.");
  }
  const obj = val as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (!expectedKeys.includes(k)) throw new Error(`Unexpected argument: ${k}`);
  }
  return obj;
}

function asText(val: unknown, field: string): string {
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new Error(`Argument "${field}" must be non-empty text.`);
  }
  return val.trim();
}

export function createBrowserTools(
  session: BrowserUserSession,
  agentId: AgentId,
  simulationId: SimulationId,
  onObservation?: (observation: Observation) => Promise<void> | void,
): readonly BrowserToolDefinition[] {
  return [
    {
      name: "browser_navigate",
      description: "Navigate to an authorized URL within the target application scope.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Relative path or full URL within authorized target scope" },
        },
        required: ["url"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["url"]);
        const url = asText(args.url, "url");
        const result = await session.navigate(url);
        if (!result.success) {
          return { error: result.error || "Navigation failed" };
        }
        return { currentUrl: result.url };
      },
    },
    {
      name: "browser_inspect",
      description: "Inspect the current page state, returning accessible ARIA structure and interactive element references.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      async invoke() {
        const snapshot = await session.inspect();
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
    },
    {
      name: "browser_click",
      description: "Click an interactive element identified by its opaque reference (e.g. 'elem_1') from the latest inspection.",
      parameters: {
        type: "object",
        properties: {
          ref: { type: "string", description: "Opaque element reference identifier (e.g. 'elem_1')" },
        },
        required: ["ref"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["ref"]);
        const ref = asText(args.ref, "ref");
        const result = await session.click(ref);
        if (!result.success) {
          return { error: result.error || "Click failed" };
        }
        return { success: true, currentUrl: result.url };
      },
    },
    {
      name: "browser_type",
      description: "Type text into an interactive input element identified by its opaque reference.",
      parameters: {
        type: "object",
        properties: {
          ref: { type: "string", description: "Opaque element reference identifier (e.g. 'elem_1')" },
          text: { type: "string", description: "Text to type into the input element" },
        },
        required: ["ref", "text"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["ref", "text"]);
        const ref = asText(args.ref, "ref");
        const text = typeof args.text === "string" ? args.text : "";
        const result = await session.type(ref, text);
        if (!result.success) {
          return { error: result.error || "Type failed" };
        }
        return { success: true, currentUrl: result.url };
      },
    },
    {
      name: "browser_scroll",
      description: "Scroll the page up or down to reveal hidden content or elements.",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down"], description: "Scroll direction: up or down" },
        },
        required: ["direction"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["direction"]);
        const direction = args.direction === "up" ? "up" : "down";
        const result = await session.scroll(direction);
        if (!result.success) {
          return { error: result.error || "Scroll failed" };
        }
        return { success: true, currentUrl: result.url };
      },
    },
    {
      name: "browser_select",
      description: "Select an option in a dropdown or select element by its opaque reference and option value.",
      parameters: {
        type: "object",
        properties: {
          ref: { type: "string", description: "Opaque element reference identifier (e.g. 'elem_1')" },
          value: { type: "string", description: "Option value to select" },
        },
        required: ["ref", "value"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["ref", "value"]);
        const ref = asText(args.ref, "ref");
        const value = asText(args.value, "value");
        const result = await session.select(ref, value);
        if (!result.success) {
          return { error: result.error || "Select failed" };
        }
        return { success: true, currentUrl: result.url };
      },
    },
    {
      name: "browser_record_observation",
      description: "Record an observed behavior on the current page as untrusted observation data attributed to this user.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Description of the observed behavior or anomaly" },
        },
        required: ["description"],
        additionalProperties: false,
      },
      async invoke(rawArgs: unknown) {
        const args = asObject(rawArgs, ["description"]);
        const description = asText(args.description, "description");
        const location = session.getCurrentUrl() || session.getTargetUrl();
        const observation = createObservation({
          id: observationId(randomUUID()),
          simulationId,
          agentId,
          observedAt: new Date().toISOString(),
          description,
          context: { location },
          evidenceIds: [],
        });
        if (onObservation) {
          await onObservation(observation);
        }
        return { observationId: observation.id, location: observation.context.location };
      },
    },
  ];
}
