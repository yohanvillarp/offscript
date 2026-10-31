import { Clock3, Globe, Info, Layers2, UsersRound } from "lucide-react";
import { SimulationsEmptyState } from "@/pages/home/ui/SimulationsEmptyState";
import { useConfigurations } from "@/pages/home/model/useConfigurations";
import { SavedConfigurationRow } from "@/pages/home/ui/SavedConfigurationRow";

export function SimulationHistory() {
  const history = useConfigurations();
  return (
    <section aria-labelledby="simulation-history-title" className="w-full min-w-0 overflow-hidden rounded-md border border-separator bg-surface">
      <div className="flex items-center gap-3 border-b border-separator px-5 py-4 sm:px-6">
        <Layers2 aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />
        <h2 id="simulation-history-title" className="text-sm font-medium">Saved simulations</h2>
        <span className="rounded-sm bg-surface-subtle px-2 py-0.5 font-mono text-xs text-muted">{history.items.length}</span>
        <button type="button" onClick={history.refresh} disabled={history.loading} className="ml-auto text-xs text-accent disabled:text-muted">Refresh</button>
      </div>

      <div role="region" aria-label="Simulation history table" tabIndex={0} className="w-full overflow-x-auto focus-visible:outline-offset-0">
        <table className="w-full min-w-3xl text-left text-xs text-muted">
          <caption className="sr-only">Latest 50 saved simulation configurations.</caption>
          <thead className="border-b border-separator bg-canvas">
            <tr>
              <th scope="col" className="w-1/3 px-5 py-3 font-medium whitespace-nowrap sm:px-6">Simulation</th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2"><Globe aria-hidden="true" className="size-3.5" strokeWidth={1.5} />Target</span>
              </th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2"><UsersRound aria-hidden="true" className="size-3.5" strokeWidth={1.5} />Users</span>
              </th>
              <th scope="col" className="px-6 py-3 text-right font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2"><Clock3 aria-hidden="true" className="size-3.5" strokeWidth={1.5} />Execution</span>
              </th>
            </tr>
          </thead>
          <tbody>{history.items.map(item => <SavedConfigurationRow key={item.simulationId} item={item} />)}</tbody>
        </table>
      </div>

      {history.loading && <p role="status" className="px-5 py-8 text-sm text-muted">Loading saved simulations…</p>}
      {history.error && <p role="alert" className="px-5 py-6 text-sm text-danger-text">{history.error}</p>}
      {!history.loading && !history.error && !history.items.length && <SimulationsEmptyState />}

      <div id="simulation-availability" className="flex items-start gap-2 border-t border-separator bg-canvas px-5 py-3 text-xs leading-relaxed text-muted sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
        <p>Configurations are stored locally. Simulation execution is not available yet.</p>
      </div>
    </section>
  );
}
