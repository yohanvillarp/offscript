import { CircleAlert, Globe, ListChecks, UsersRound } from "lucide-react";
import type { SimulationDraft } from "@/pages/new-simulation/model/draft";
import { participantCatalog } from "@/pages/new-simulation/model/participants";
import { UserAvatar } from "@/pages/new-simulation/ui/UserAvatar";
import { validateParticipants, validateTarget } from "@/pages/new-simulation/model/validation";

export function ConfigurationSummary({ draft }: Readonly<{ draft: SimulationDraft }>) {
  const issues = Object.values({ ...validateTarget(draft), ...validateParticipants(draft) });

  return (
    <section aria-labelledby="summary-heading" className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <ListChecks aria-hidden="true" className="mb-4 size-5 text-accent" strokeWidth={1.5} />
          <h2 id="summary-heading" className="text-xl font-medium">Configuration summary</h2>
        </div>
        <span className="rounded-sm bg-surface-subtle px-2 py-1 font-mono text-xs text-muted">DRAFT</span>
      </div>
      {issues.length > 0 && (
        <div className="rounded-md bg-surface-subtle p-4 text-sm">
          <p className="mb-2 font-medium">Complete the configuration</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            {issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs text-muted">Simulation</p>
        <p className="break-words text-2xl font-medium">{draft.name.trim() || "Untitled simulation"}</p>
      </div>
      <section aria-labelledby="summary-target-heading" className="border-t border-separator pt-6">
        <h3 id="summary-target-heading" className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Globe aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />Target
        </h3>
        <dl className="grid gap-5 text-sm sm:grid-cols-3">
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-muted">Application URL</dt>
            <dd className="mt-2 break-all font-mono text-xs leading-relaxed">{draft.url.trim() || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Environment</dt>
            <dd className="mt-2 capitalize">{draft.environment}</dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="summary-goal-heading" className="border-t border-separator pt-6">
        <h3 id="summary-goal-heading" className="text-sm font-medium">Exploration goal</h3>
        <p className="mt-3 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">{draft.goal.trim() || "Not specified"}</p>
        <p className="mt-2 text-xs text-muted">Shared by all selected users.</p>
      </section>
      <section aria-labelledby="summary-participants-heading" className="border-t border-separator pt-6">
        <h3 id="summary-participants-heading" className="mb-4 flex items-center gap-2 text-sm font-medium">
          <UsersRound aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />Users
          <span className="ml-auto font-mono text-xs text-muted">{draft.participants.length}</span>
        </h3>
        {draft.participants.length ? (
          <ul className="grid gap-5 sm:grid-cols-3">
            {draft.participants.map((participant) => (
              <li key={participant.id} className="flex min-w-0 items-center gap-4">
                <UserAvatar identity={participant.id} />
                <span className="min-w-0 break-words">
                  <span className="block text-sm font-medium">{participant.name}</span>
                  <span className="mt-1 block text-xs text-muted">{participantCatalog.find((option) => option.id === participant.id)?.profile}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">None selected</p>}
      </section>
      <div className="space-y-3 border-t border-separator pt-5 text-xs leading-relaxed text-muted">
        <p>Leaving or reloading this page discards this draft.</p>
        <p id="execution-availability" className="flex items-start gap-2">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          Execution is not available yet. This draft does not save a simulation, grant permissions, or contact the target.
        </p>
      </div>
    </section>
  );
}
