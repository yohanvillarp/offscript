import { FunctionCallItem, ModelMessageItem, ReasoningItem } from "@mozaik-ai/core";
import type { InferenceInput, InferenceOutput, InferenceRunner } from "@mozaik-ai/core";
import type { AgentId } from "../domain/index.ts";
import type { ExplorationState } from "./state.ts";

function stopped(): InferenceOutput {
  return { items: [ModelMessageItem.rehydrate({ text: "This turn stopped at the runtime boundary." })], tokenUsage: undefined, rowResponse: null };
}

// Decorate a runtime-owned runner. The injected runner is copied by the session
// before decoration, so sharing a test/provider runner cannot cross-wire sessions.
export function guardInference(
  runner: InferenceRunner, state: ExplorationState, contextIds: Map<string, AgentId>,
  maxCalls: number, timeoutMs: number,
): void {
  const run = runner.run.bind(runner);
  runner.run = async (input: InferenceInput): Promise<InferenceOutput> => {
    const id = contextIds.get(input.context.id);
    const turn = id ? state.turns.get(id) : undefined;
    if (state.closed || !id || !turn) return stopped();
    turn.inferenceCalls++;
    if (turn.inferenceCalls > maxCalls) {
      state.fail("inference-budget", id, new Error("Inference budget exceeded."));
      return stopped();
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const output = await Promise.race([
        run(input),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Inference deadline exceeded.")), timeoutMs); }),
      ]);
      if (state.closed) return stopped();
      // 4.2.0 only executes the first function call; reject mixed/multiple calls
      // instead of silently pretending all model-requested operations ran.
      const actions = output.items.filter((item) => item instanceof FunctionCallItem || item instanceof ModelMessageItem);
      if (actions.length !== 1 || output.items.some((item) => !(item instanceof FunctionCallItem || item instanceof ModelMessageItem || item instanceof ReasoningItem))) {
        throw new Error("This adapter requires one function call or one answer per inference output.");
      }
      return output;
    } catch (cause) {
      state.fail("inference", id, cause);
      return stopped();
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
