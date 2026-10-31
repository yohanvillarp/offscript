import type { InferenceRunner } from "@mozaik-ai/core";
import { createControlledDemoSessionFactory } from "./controlled-demo-factory.ts";
import { createBrowserExplorationSessionFactory } from "./browser-exploration-factory.ts";
import type { ExecutionSessionContext, ExecutionSessionFactory } from "../runtime/host.ts";
import type { Simulation } from "../domain/index.ts";
import type { ExecutionLimits } from "../contracts/index.ts";
import type { HostStorage } from "../runtime/host-storage.ts";

export type MultiModeSessionFactoryOptions = Readonly<{
  runner?: InferenceRunner | undefined;
  headless?: boolean | undefined;
  model?: string | undefined;
}>;

export function createMultiModeSessionFactory(
  options: MultiModeSessionFactoryOptions = {},
): ExecutionSessionFactory {
  const controlled = createControlledDemoSessionFactory(
    options.runner !== undefined ? { runner: options.runner } : undefined,
  );
  const browser = createBrowserExplorationSessionFactory(options);

  return (
    simulation: Simulation,
    limits: ExecutionLimits,
    storage: HostStorage,
    context?: ExecutionSessionContext,
  ) => {
    if (context?.mode === "browser-exploration") {
      return browser(simulation, limits, storage, context);
    }
    return controlled(simulation, limits, storage, context);
  };
}
