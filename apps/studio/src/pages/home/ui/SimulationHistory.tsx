import { Clock3, Globe, Info, Layers2, UsersRound } from "lucide-react";
import { SimulationsEmptyState } from "@/pages/home/ui/SimulationsEmptyState";

export function SimulationHistory() {
  return (
    <section aria-labelledby="simulation-history-title" className="w-full min-w-0 overflow-hidden rounded-md border border-separator bg-surface">
      <div className="flex items-center gap-3 border-b border-separator px-5 py-4 sm:px-6">
        <Layers2 aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />
        <h2 id="simulation-history-title" className="text-sm font-medium">All simulations</h2>
        <span className="rounded-sm bg-surface-subtle px-2 py-0.5 font-mono text-xs text-muted">0</span>
      </div>

      <div role="region" aria-label="Simulation history table" tabIndex={0} className="w-full overflow-x-auto focus-visible:outline-offset-0">
        <table aria-describedby="simulation-empty-title" className="w-full min-w-3xl text-left text-xs text-muted">
          <caption className="sr-only">Simulation history. No simulations are available.</caption>
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
                <span className="inline-flex items-center gap-2"><Clock3 aria-hidden="true" className="size-3.5" strokeWidth={1.5} />Last activity</span>
              </th>
            </tr>
          </thead>
          <tbody />
        </table>
      </div>

      <SimulationsEmptyState />

      <div id="simulation-availability" className="flex items-start gap-2 border-t border-separator bg-canvas px-5 py-3 text-xs leading-relaxed text-muted sm:px-6">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
        <p>Configurations are drafts. Simulation execution is not available yet.</p>
      </div>
    </section>
  );
}
