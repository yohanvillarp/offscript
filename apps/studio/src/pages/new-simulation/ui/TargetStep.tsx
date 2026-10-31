import { Globe } from "lucide-react";
import { environments } from "@/pages/new-simulation/model/draft";
import type { DraftErrors, SimulationDraft } from "@/pages/new-simulation/model/draft";
import { DraftField } from "@/pages/new-simulation/ui/DraftField";
import type { TargetSuggestion } from "@offscript/contracts";
import { TargetConnection } from "@/pages/new-simulation/ui/TargetConnection";

type Props = Readonly<{ draft: SimulationDraft; errors: DraftErrors; onChange: (patch: Partial<Omit<SimulationDraft, "participants">>) => void; suggestion?: TargetSuggestion | undefined }>;

export function TargetStep({ draft, errors, onChange, suggestion }: Props) {
  return (
    <section aria-labelledby="target-heading" className="w-full space-y-6 sm:space-y-7">
      <div>
        <Globe aria-hidden="true" className="mb-4 size-5 text-accent" strokeWidth={1.5} />
        <h2 id="target-heading" className="text-xl font-medium">Choose the application</h2>
        <p className="mt-2 text-sm text-muted">Define what this simulation will explore.</p>
      </div>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <DraftField id="name" label="Simulation name" value={draft.name} placeholder="e.g. Checkout flow exploration" error={errors.name} onChange={(name) => onChange({ name })} />
        <div className="space-y-3">
          <DraftField id="url" label="Application URL" type="url" value={draft.url} placeholder={suggestion?.url ?? "http://localhost:3000"} error={errors.url} onChange={(url) => onChange({ url })}
            hint={suggestion && draft.url === suggestion.url ? `Suggested from ${suggestion.source === "vite-script" ? `the port in npm run ${suggestion.scriptName}` : "Vite's default port"}. Project configuration may override it.` : "Use a complete HTTP or HTTPS address."} />
          <TargetConnection key={draft.url} url={draft.url} />
        </div>
      </div>
      <DraftField
        id="goal"
        label="Exploration goal"
        multiline
        value={draft.goal}
        placeholder="e.g. Navigate through the catalog, search for products, add an item to the cart, and proceed to checkout."
        error={errors.goal}
        onChange={(goal) => onChange({ goal })}
        hint="Describe the outcome all selected users should pursue, rather than a sequence of steps. Each user will approach it differently."
      />
      <fieldset className="min-w-0">
        <legend className="mb-3 text-sm font-medium">Environment</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {environments.map((environment) => (
            <label key={environment} className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2.5 text-sm capitalize ${draft.environment === environment ? "border-accent bg-accent-subtle" : "border-separator bg-surface"}`}>
              <input type="radio" name="environment" value={environment} checked={draft.environment === environment} onChange={() => onChange({ environment })} className="accent-accent" />
              {environment}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Classification only. Selecting an environment does not authorize actions.</p>
      </fieldset>
    </section>
  );
}
