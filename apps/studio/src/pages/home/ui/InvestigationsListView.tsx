import type { InvestigationSummary } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type Props = Readonly<{ investigations: readonly InvestigationSummary[] }>;

export function InvestigationsListView({ investigations }: Props) {
  if (investigations.length === 0) {
    return <p className="text-xs text-muted">No investigations requested for this simulation yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {investigations.map((inv) => {
        const requester = participantCatalog.find(
          (p) => p.profileId === inv.requestedBy || p.id === inv.requestedBy,
        );
        const status = inv.lifecycle.status;

        return (
          <li
            key={inv.id}
            className="rounded-lg border border-separator bg-surface p-3 space-y-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground leading-snug">{inv.hypothesis}</span>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                  status === "completed"
                    ? "bg-accent-subtle text-accent"
                    : status === "assigned"
                    ? "bg-surface-hover text-foreground"
                    : "bg-surface-subtle text-muted"
                }`}
              >
                {status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
              <div className="flex items-center gap-1.5">
                <span>Requested by:</span>
                {requester ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <UserAvatar identity={requester.id} className="size-4" />
                    <span>{requester.name}</span>
                  </span>
                ) : (
                  <span className="font-mono">{inv.requestedBy}</span>
                )}
              </div>

              {status !== "requested" && inv.lifecycle.agentIds.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span>Assigned:</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {inv.lifecycle.agentIds.map((agentId) => {
                      const participant = participantCatalog.find(
                        (p) => p.profileId === agentId || p.id === agentId,
                      );
                      return participant ? (
                        <span key={agentId} title={`${participant.name} (${participant.profile})`}>
                          <UserAvatar identity={participant.id} className="size-4 rounded-full ring-1 ring-surface" />
                        </span>
                      ) : (
                        <span key={agentId} className="font-mono text-muted">{agentId}</span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {status === "completed" && inv.lifecycle.result && (
              <div className="rounded-md bg-surface-subtle p-2 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted">Result outcome:</span>
                  <span className="font-medium uppercase text-foreground">{inv.lifecycle.result.outcome}</span>
                </div>
                <p className="text-muted leading-relaxed">{inv.lifecycle.result.explanation}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
