import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileSearch, Sparkles, Eye, ClipboardList } from "lucide-react";
import type { SimulationResults } from "@offscript/contracts";
import { loadSimulationResults, StudioApiError } from "@/shared/api/studio";
import { FindingsListView } from "./FindingsListView";
import { ObservationsListView } from "./ObservationsListView";
import { InvestigationsListView } from "./InvestigationsListView";

type Tab = "findings" | "observations" | "investigations";

type Props = Readonly<{
  simulationId: string;
  refreshTrigger?: number | string | undefined;
}>;

export function SimulationResultsView({ simulationId, refreshTrigger }: Props) {
  const [results, setResults] = useState<SimulationResults | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("findings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    const abort = new AbortController();

    void loadSimulationResults(simulationId, abort.signal)
      .then((data) => {
        if (!unmounted.current) {
          setResults(data);
          setError(undefined);
          setLoading(false);
        }
      })
      .catch((cause) => {
        if (!unmounted.current) {
          if (cause instanceof StudioApiError) {
            setError(cause.message);
          } else if (cause instanceof Error && cause.name !== "AbortError") {
            setError("Could not load simulation results.");
          }
          setLoading(false);
        }
      });

    return () => {
      unmounted.current = true;
      abort.abort();
    };
  }, [simulationId, refreshTrigger]);

  const findingsCount = results?.findings.length ?? 0;
  const observationsCount = results?.observations.length ?? 0;
  const investigationsCount = results?.investigations.length ?? 0;
  const hasData = findingsCount > 0 || observationsCount > 0 || investigationsCount > 0;

  return (
    <section aria-labelledby="results-section-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-separator pb-2">
        <h3 id="results-section-title" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <FileSearch aria-hidden="true" className="size-3.5" />
          <span>Exploration results</span>
        </h3>
        {loading && <span className="text-[11px] text-muted">Refreshing...</span>}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-md bg-danger-subtle p-2 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !hasData && !error && (
        <div className="rounded-lg border border-dashed border-separator p-5 text-center">
          <p className="text-xs text-muted">No exploration results recorded yet.</p>
          <p className="mt-1 text-[11px] text-muted/80">
            Run browser exploration or the controlled demo above to see observations and corroborated findings.
          </p>
        </div>
      )}

      {hasData && (
        <div className="space-y-4">
          <div role="tablist" aria-label="Results sections" className="flex rounded-md bg-surface-subtle p-1 text-xs">
            <button
              role="tab"
              type="button"
              aria-selected={tab === "findings"}
              onClick={() => setTab("findings")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1 font-medium transition-colors ${
                tab === "findings" ? "bg-surface text-foreground shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              <Sparkles aria-hidden="true" className="size-3" />
              <span>Findings</span>
              <span className="rounded-full bg-surface-hover px-1.5 py-0.2 font-mono text-[10px] text-muted">
                {findingsCount}
              </span>
            </button>

            <button
              role="tab"
              type="button"
              aria-selected={tab === "observations"}
              onClick={() => setTab("observations")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1 font-medium transition-colors ${
                tab === "observations" ? "bg-surface text-foreground shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              <Eye aria-hidden="true" className="size-3" />
              <span>Observations</span>
              <span className="rounded-full bg-surface-hover px-1.5 py-0.2 font-mono text-[10px] text-muted">
                {observationsCount}
              </span>
            </button>

            <button
              role="tab"
              type="button"
              aria-selected={tab === "investigations"}
              onClick={() => setTab("investigations")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded py-1 font-medium transition-colors ${
                tab === "investigations" ? "bg-surface text-foreground shadow-xs" : "text-muted hover:text-foreground"
              }`}
            >
              <ClipboardList aria-hidden="true" className="size-3" />
              <span>Investigations</span>
              <span className="rounded-full bg-surface-hover px-1.5 py-0.2 font-mono text-[10px] text-muted">
                {investigationsCount}
              </span>
            </button>
          </div>

          <div role="tabpanel" className="mt-2">
            {tab === "findings" && <FindingsListView findings={results?.findings ?? []} />}
            {tab === "observations" && <ObservationsListView observations={results?.observations ?? []} />}
            {tab === "investigations" && <InvestigationsListView investigations={results?.investigations ?? []} />}
          </div>
        </div>
      )}
    </section>
  );
}
