import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import type { FindingAssessment } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type Props = Readonly<{ findings: readonly FindingAssessment[] }>;

export function FindingsListView({ findings }: Props) {
  if (findings.length === 0) {
    return <p className="text-xs text-muted">No findings evaluated for this simulation yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {findings.map((finding) => {
        const isConfirmed = finding.isConfirmedFinding;
        const confidence = finding.confidence;
        return (
          <li
            key={finding.investigationId}
            className="rounded-lg border border-separator bg-surface p-3.5 space-y-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground leading-snug">{finding.hypothesis}</span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isConfirmed
                    ? "bg-accent-subtle text-accent"
                    : confidence === "provisional"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : confidence === "refuted"
                    ? "bg-danger-subtle text-danger"
                    : "bg-surface-hover text-muted"
                }`}
              >
                {isConfirmed ? (
                  <>
                    <CheckCircle2 aria-hidden="true" className="size-3" />
                    <span>Confirmed finding</span>
                  </>
                ) : confidence === "provisional" ? (
                  <>
                    <AlertTriangle aria-hidden="true" className="size-3" />
                    <span>Provisional</span>
                  </>
                ) : confidence === "refuted" ? (
                  <>
                    <XCircle aria-hidden="true" className="size-3" />
                    <span>Refuted</span>
                  </>
                ) : (
                  <>
                    <HelpCircle aria-hidden="true" className="size-3" />
                    <span>Inconclusive</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-muted leading-relaxed">{finding.explanation}</p>

            {finding.uncertaintyReason && (
              <p className="rounded-md bg-surface-subtle p-2 text-[11px] text-muted italic">
                {finding.uncertaintyReason}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator/50 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted">
                <span>Participants:</span>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {finding.participatingAgents.map((agentId) => {
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

              {finding.evidenceIds.length > 0 && (
                <div className="flex items-center gap-1 text-muted">
                  <span>Evidence:</span>
                  <div className="flex flex-wrap gap-1">
                    {finding.evidenceIds.map((eid) => (
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
