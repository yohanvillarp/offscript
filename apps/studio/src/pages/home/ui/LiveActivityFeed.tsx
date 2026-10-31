import { Activity, Globe, MousePointer, Keyboard, ArrowUpDown, CheckSquare, Eye, Search } from "lucide-react";
import type { AgentActivityItem } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type Props = Readonly<{
  activity: readonly AgentActivityItem[];
}>;

function actionIcon(action: string) {
  switch (action) {
    case "navigate": return <Globe className="size-3 text-accent" />;
    case "click": return <MousePointer className="size-3 text-sky-500" />;
    case "type": return <Keyboard className="size-3 text-indigo-500" />;
    case "scroll": return <ArrowUpDown className="size-3 text-emerald-500" />;
    case "select": return <CheckSquare className="size-3 text-amber-500" />;
    case "observe": return <Eye className="size-3 text-accent" />;
    case "inspect": return <Search className="size-3 text-muted" />;
    default: return <Activity className="size-3 text-muted" />;
  }
}

export function LiveActivityFeed({ activity }: Props) {
  if (activity.length === 0) return null;
  const reversed = [...activity].reverse().slice(0, 8);

  return (
    <div className="mt-3 space-y-2 border-t border-separator pt-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted uppercase tracking-wider">
        <Activity aria-hidden="true" className="size-3 text-accent animate-pulse" />
        <span>Live activity</span>
      </div>

      <ul className="space-y-1.5" aria-label="Recent agent activities">
        {reversed.map((act, index) => {
          const participant = participantCatalog.find(
            (p) => p.profileId === act.agentId || p.id === act.agentId,
          );
          const time = new Date(act.timestamp).toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });

          return (
            <li
              key={`${act.timestamp}-${index}`}
              className="flex items-center justify-between gap-2 rounded bg-surface p-1.5 text-[11px] text-foreground border border-separator/40"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {participant ? (
                  <UserAvatar identity={participant.id} className="size-4 shrink-0" />
                ) : (
                  <span className="font-mono text-[10px] text-muted shrink-0">{act.agentId}</span>
                )}
                <span className="shrink-0">{actionIcon(act.action)}</span>
                <span className="font-medium capitalize text-foreground shrink-0">{act.action}</span>
                {act.location && (
                  <span className="font-mono text-[10px] text-muted truncate max-w-[120px]" title={act.location}>
                    {act.location}
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] text-muted shrink-0">{time}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
