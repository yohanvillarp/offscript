import type { openPersistence } from "../persistence/index.ts";

type Persistence = ReturnType<typeof openPersistence>;

export function hostStorage(source: Persistence) {
  let accepting = true;
  const pending = new Set<Promise<unknown>>();
  function guard<Args extends unknown[], Result>(operation: (...args: Args) => Promise<Result>) {
    return (...args: Args): Promise<Result> => {
      if (!accepting) return Promise.reject(new Error("Host storage is closed to new operations."));
      const result = Promise.resolve().then(() => operation(...args));
      pending.add(result);
      void result.then(() => pending.delete(result), () => pending.delete(result));
      return result;
    };
  }
  const storage = Object.freeze({
    configurations: Object.freeze({
      deleteConfiguredSimulation: guard(source.configurations.deleteConfiguredSimulation),
      createConfiguredSimulation: guard(source.configurations.createConfiguredSimulation),
      findConfiguration: guard(source.configurations.findConfiguration),
      listConfigurations: guard(source.configurations.listConfigurations),
    }),
    observations: Object.freeze({
      createObservation: guard(source.observations.createObservation), findObservation: guard(source.observations.findObservation),
    }),
    investigations: Object.freeze({
      findInvestigation: guard(source.investigations.findInvestigation),
      commitRequest: guard(source.investigations.commitRequest), commitAssignment: guard(source.investigations.commitAssignment),
    }),
    outbox: Object.freeze({
      claim: guard(source.outbox.claim), accept: guard(source.outbox.accept), defer: guard(source.outbox.defer),
      reject: guard(source.outbox.reject), inspect: guard(source.outbox.inspect), hasPending: guard(source.outbox.hasPending),
    }),
  });
  return { storage,
    async drain() { accepting = false; await Promise.allSettled(pending); },
  };
}

export type HostStorage = ReturnType<typeof hostStorage>["storage"];
