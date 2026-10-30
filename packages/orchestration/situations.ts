import { SituationSpecification } from "@mozaik-ai/core";
import type { SemanticEvent, SituationContext, SituationHandler } from "@mozaik-ai/core";
import type { AgentId } from "../domain/index.ts";
import type { ExplorationState } from "./state.ts";

class When extends SituationSpecification {
  private readonly matches: (event: SemanticEvent) => boolean;
  constructor(matches: (event: SemanticEvent) => boolean) { super(); this.matches = matches; }
  isSatisfiedBy({ event }: SituationContext): boolean { return this.matches(event); }
}

export function situation(
  state: ExplorationState, id: AgentId | undefined,
  matches: (event: SemanticEvent) => boolean, apply: (event: SemanticEvent) => void | Promise<void>,
): SituationHandler {
  return {
    specification: new When(matches),
    processor: { apply({ event }) {
      if (state.closed) return;
      try {
        const pending = apply(event);
        if (pending) {
          state.pendingCallbacks++;
          void pending.catch((cause: unknown) => state.fail("handler", id, cause))
            .finally(() => { state.pendingCallbacks--; });
        }
      } catch (cause) { state.fail("handler", id, cause); }
    } },
  };
}
