import { useState } from "react";
import { Camera, MapPin } from "lucide-react";
import type { ObservationSummary } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { EvidencePreviewModal } from "./EvidencePreviewModal";

type Props = Readonly<{
  simulationId: string;
  observations: readonly ObservationSummary[];
}>;

export function ObservationsListView({ simulationId, observations }: Props) {
  const [selectedEvidence, setSelectedEvidence] = useState<string | undefined>(undefined);

  if (observations.length === 0) {
    return <p className="text-xs text-muted">No observations recorded for this simulation yet.</p>;
  }

  return (
    <>
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
                        <button
                          key={eid}
                          type="button"
                          onClick={() => setSelectedEvidence(eid)}
                          className="inline-flex items-center gap-1 rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-surface-hover hover:text-accent transition-colors"
                          title="Click to preview visual evidence screenshot"
                        >
                          <Camera aria-hidden="true" className="size-2.5 text-accent" />
                          <span>{eid}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {selectedEvidence && (
        <EvidencePreviewModal
          simulationId={simulationId}
          evidenceId={selectedEvidence}
          onClose={() => setSelectedEvidence(undefined)}
        />
      )}
    </>
  );
}
