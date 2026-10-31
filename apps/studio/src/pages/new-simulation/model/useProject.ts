import { useEffect, useState } from "react";
import type { ProjectDescriptor } from "@offscript/contracts";
import { loadProject } from "@/shared/api/studio";

export function useProject() {
  const [project, setProject] = useState<ProjectDescriptor>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    void loadProject(abort.signal).then(value => { if (!abort.signal.aborted) { setProject(value); setError(undefined); } })
      .catch((cause: unknown) => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Project recognition failed."); });
    return () => abort.abort();
  }, [attempt]);
  return { project, error, retry: () => setAttempt(value => value + 1) };
}
