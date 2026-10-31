import { useEffect, useRef, useState } from "react";
import type { TargetConnection } from "@offscript/contracts";
import { checkTarget } from "@/shared/api/studio";

export function useTargetConnection(url: string) {
  const pending = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ url: string; checking: boolean; result?: TargetConnection; error?: string }>();
  useEffect(() => {
    return () => { pending.current?.abort(); pending.current = null; };
  }, [url]);
  async function check() {
    pending.current?.abort();
    const abort = new AbortController();
    pending.current = abort;
    setState({ url, checking: true });
    try {
      const result = await checkTarget(url, abort.signal);
      if (!abort.signal.aborted) setState({ url, checking: false, result });
    } catch (error) {
      if (!abort.signal.aborted) setState({ url, checking: false, error: error instanceof Error ? error.message : "Connection check failed." });
    }
  }
  return { state: state?.url === url ? state : undefined, check };
}
