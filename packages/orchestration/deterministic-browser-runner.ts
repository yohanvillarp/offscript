import {
  FunctionCallItem,
  FunctionCallOutputItem,
  ModelMessageItem,
  UserMessageItem,
} from "@mozaik-ai/core";
import type { InferenceInput, InferenceOutput, InferenceRunner } from "@mozaik-ai/core";

export function deterministicBrowserRunner(): InferenceRunner {
  let firstContext: string | undefined;

  function call(name: string, args: Record<string, unknown>): InferenceOutput {
    return {
      items: [
        FunctionCallItem.rehydrate({
          callId: crypto.randomUUID(),
          name,
          args: JSON.stringify(args),
        }),
      ],
      tokenUsage: undefined,
      rowResponse: null,
    };
  }

  return {
    async run(input: InferenceInput) {
      firstContext ??= input.context.id;
      // Yield to allow concurrent Mozaik agent execution progress
      await new Promise((resolve) => setTimeout(resolve, 5));

      const items = input.context.getItems();
      const userIndex = items.findLastIndex((item) => item instanceof UserMessageItem);
      const current = items.slice(userIndex + 1);
      const calls = current.filter((item) => item instanceof FunctionCallItem);
      const outputs = current.filter((item) => item instanceof FunctionCallOutputItem);

      // Step 0: Initial navigation
      if (!calls.length) {
        return call("browser_navigate", { url: "/" });
      }

      // Step 1: Inspect DOM & accessible state
      if (calls.length === 1) {
        return call("browser_inspect", {});
      }

      // Step 2: Act on interactive elements
      if (calls.length === 2) {
        const inspectOutput = outputs.find((item) => item.output.text.includes("elements"));
        let targetRef = "elem_1";
        if (inspectOutput) {
          try {
            const parsed = JSON.parse(inspectOutput.output.text) as {
              elements?: Array<{ ref: string; name?: string; role?: string; disabled?: boolean }>;
            };
            const clickable = parsed.elements?.find(
              (el) => !el.disabled && (el.role === "button" || el.role === "link"),
            );
            if (clickable) targetRef = clickable.ref;
          } catch {
            targetRef = "elem_1";
          }
        }
        return call("browser_click", { ref: targetRef });
      }

      // Step 3: Record observation
      if (calls.length === 3) {
        return call("record_observation", {
          description: "Observed interactive application behavior on target page.",
          location: "/",
        });
      }

      // Step 4: First agent requests collaborative investigation
      const observationOutput = outputs.find((item) => item.output.text.includes("observationId"));
      const userMessage = items[userIndex];
      const isInvestigating =
        userMessage instanceof UserMessageItem && userMessage.content.text.startsWith("Investigate");

      if (calls.length === 4 && firstContext === input.context.id && !isInvestigating && observationOutput) {
        try {
          const parsed = JSON.parse(observationOutput.output.text) as { observationId?: string };
          if (parsed.observationId) {
            return call("request_investigation", {
              hypothesis: "Target application interaction requires collaborative verification.",
              observationIds: [parsed.observationId],
            });
          }
        } catch {
          // Fall through to terminal message
        }
      }

      return {
        items: [
          ModelMessageItem.rehydrate({
            text: "Completed autonomous exploration turn. Observation recorded without confirming a defect.",
          }),
        ],
        tokenUsage: undefined,
        rowResponse: null,
      };
    },

    async *stream() {
      yield* [];
      throw new Error("The deterministic browser fixture does not stream.");
    },
  };
}
