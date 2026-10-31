import { FunctionCallItem, FunctionCallOutputItem, ModelMessageItem, UserMessageItem } from "@mozaik-ai/core";
import type { InferenceInput, InferenceOutput, InferenceRunner } from "@mozaik-ai/core";

// Deterministic inference fixture only. Mozaik still owns turn execution,
// tool invocation, follow-up inference, and event fan-out.
export function deterministicRunner(options?: { completeInvestigation?: boolean }): InferenceRunner {
  let firstContext: string | undefined;
  function call(name: string, args: Record<string, unknown>): InferenceOutput {
    return {
      items: [FunctionCallItem.rehydrate({ callId: crypto.randomUUID(), name, args: JSON.stringify(args) })],
      tokenUsage: undefined,
      rowResponse: null,
    };
  }
  return {
    async run(input: InferenceInput) {
      firstContext ??= input.context.id;
      // Yield so two real Mozaik loops can make progress concurrently.
      await new Promise((resolve) => setTimeout(resolve, 1));
      const items = input.context.getItems();
      const userIndex = items.findLastIndex((item) => item instanceof UserMessageItem);
      const current = items.slice(userIndex + 1);
      const calls = current.filter((item) => item instanceof FunctionCallItem);
      const outputs = current.filter((item) => item instanceof FunctionCallOutputItem);
      const observationOutput = outputs.find((item) => item.output.text.includes("observationId"));
      const message = items[userIndex];
      const investigating = message instanceof UserMessageItem && message.content.text.startsWith("Investigate");
      if (!calls.length) return call("inspect_application", { phase: "before_reload" });
      if (calls.length === 1) return call("inspect_application", { phase: "after_reload" });
      if (calls.length === 2) {
        return call("record_observation", {
          description: investigating
            ? "Corroborated: The simulated cart changes from one item to zero after reload."
            : "The simulated cart changes from one item to zero after reload.",
          location: "/cart",
        });
      }
      if (calls.length === 3 && firstContext === input.context.id && !investigating && observationOutput) {
        const output: unknown = JSON.parse(observationOutput.output.text);
        if (output && typeof output === "object" && "observationId" in output && typeof output.observationId === "string") {
          return call("request_investigation", {
            hypothesis: "Cart state may not survive reload.",
            observationIds: [output.observationId],
          });
        }
      }
      if (calls.length === 3 && investigating && options?.completeInvestigation && observationOutput) {
        const match = message.content.text.match(/"id":"([^"]+)"/);
        const invId = match ? match[1] : undefined;
        const output: unknown = JSON.parse(observationOutput.output.text);
        if (invId && output && typeof output === "object" && "observationId" in output && typeof output.observationId === "string") {
          const eid = ("evidenceId" in output && typeof output.evidenceId === "string") ? output.evidenceId : output.observationId;
          return call("complete_investigation", {
            investigationId: invId,
            outcome: "supported",
            explanation: "Verified that cart resets to zero items after reload.",
            evidenceIds: [eid],
          });
        }
      }
      return {
        items: [ModelMessageItem.rehydrate({ text: "Recorded my contribution; this does not confirm a defect." })],
        tokenUsage: undefined,
        rowResponse: null,
      };
    },
    async *stream() { yield* []; throw new Error("The deterministic fixture does not stream."); },
  };
}
