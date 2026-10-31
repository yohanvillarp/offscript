import { MapPin } from "lucide-react";
import type { ObservationSummary } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type Props = Readonly<{ observations: readonly ObservationSummary[] }>;

export function ObservationsListView({ observations }: Props) {
  if (observations.length === 0) {
    return <p className="text-xs text-muted">No observations recorded for this simulation yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {observations.map((obs) => {
        const participant = participantCatalog.find(
          (p) => p.profileId === obs.agentId || p.id === obs.agentId,
        );
        const time = new Date(obs.observedAt).toLocaleTimeString([], {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });

        return (
          <li
            key={obs.id}
            className="rounded-lg border border-separator bg-surface p-3 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {participant ? (
                  <>
                    <UserAvatar identity={participant.id} className="size-5" />
                    <span className="font-medium text-foreground">{participant.name}</span>
                  </>
                ) : (
                  <span className="font-mono text-foreground">{obs.agentId}</span>
                )}
                <span className="text-muted">·</span>
                <span className="font-mono text-[11px] text-muted">{time}</span>
              </div>
              <span className="font-mono text-[10px] text-muted">{obs.id}</span>
            </div>

            <p className="text-foreground leading-relaxed">{obs.description}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator/50 pt-2 text-[11px]">
              <div className="flex items-center gap-1 text-muted">
                <MapPin aria-hidden="true" className="size-3" />
                <span className="font-mono text-[10px] text-muted">{obs.context.location}</span>
              </div>

              {obs.evidenceIds.length > 0 && (
                <div className="flex items-center gap-1 text-muted">
                  <span>Evidence:</span>
                  <div className="flex flex-wrap gap-1">
                    {obs.evidenceIds.map((eid) => (
                      <span key={eid} className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        {eid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
