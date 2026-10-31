import { useEffect, useState } from "react";
import type { SimulationConfiguration } from "@offscript/contracts";
import { loadConfigurations } from "@/shared/api/studio";

export function useConfigurations() {
  const [items, setItems] = useState<readonly SimulationConfiguration[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void loadConfigurations(abort.signal).then(values => {
      if (!abort.signal.aborted) { setItems(values); setError(undefined); }
    }).catch((cause: unknown) => {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load saved simulations.");
    }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [attempt]);
  return { items, error, loading, refresh: () => { setLoading(true); setAttempt(value => value + 1); } };
}
