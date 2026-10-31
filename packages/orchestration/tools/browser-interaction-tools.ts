import type { Tool } from "@mozaik-ai/core";
import type { BrowserUserSession } from "../../browser/index.ts";
import type { ToolName } from "../state.ts";
import { argumentsObject, argumentText } from "./arguments.ts";

export type ToolFactory = (
  name: ToolName,
  description: string,
  properties: Record<string, unknown>,
  invoke: (args: unknown) => Promise<unknown>,
) => Tool;

export function browserInteractionTools(
  tool: ToolFactory,
  browserSession: BrowserUserSession,
): Tool[] {
  const text = { type: "string", minLength: 1 };

  return [
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
      "browser_scroll",
      "Scroll the page up or down to reveal hidden content or elements below the fold.",
      { direction: { type: "string", enum: ["up", "down"] } },
      async (value) => {
        const args = argumentsObject(value, ["direction"]);
        const dir = args.direction === "up" ? "up" : "down";
        const result = await browserSession.scroll(dir);
        if (!result.success) throw new Error(result.error || "Scroll failed.");
        return { currentUrl: result.url };
      },
    ),
    tool(
      "browser_select",
      "Select an option on a select or dropdown element using its opaque reference (e.g. elem_1) and option value.",
      { ref: text, value: text },
      async (value) => {
        const args = argumentsObject(value, ["ref", "value"]);
        const ref = argumentText(args.ref);
        const val = argumentText(args.value);
        const result = await browserSession.select(ref, val);
        if (!result.success) throw new Error(result.error || "Select failed.");
        return { currentUrl: result.url };
      },
    ),
  ];
}
