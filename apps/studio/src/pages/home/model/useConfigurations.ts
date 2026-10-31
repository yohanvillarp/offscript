import { useEffect, useRef, useState } from "react";
import type { SimulationConfiguration } from "@offscript/contracts";
import { loadConfigurations } from "@/shared/api/studio";

export function useConfigurations() {
  const [items, setItems] = useState<readonly SimulationConfiguration[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const active = useRef<AbortController | null>(null);
  const afterDeletion = useRef(false);
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    const abort = new AbortController();
    active.current = abort;
    void loadConfigurations(abort.signal).then(values => {
      if (!abort.signal.aborted) { setItems(values); setError(undefined); }
    }).catch((cause: unknown) => {
      if (!abort.signal.aborted) setError(afterDeletion.current ? "The simulation was deleted, but the list could not be refreshed. Try Refresh." : cause instanceof Error ? cause.message : "Could not load saved simulations.");
    }).finally(() => { if (!abort.signal.aborted) { setLoading(false); afterDeletion.current = false; } });
    return () => abort.abort();
  }, [attempt]);
  function removed(id: string) {
    active.current?.abort();
    setItems(current => current.filter(item => item.simulationId !== id));
    setError(undefined); setNotice("Simulation deleted."); afterDeletion.current = true;
    setLoading(true); setAttempt(value => value + 1);
  }
  return { items, error, notice, loading, removed, refresh: () => { setLoading(true); setAttempt(value => value + 1); } };
}
