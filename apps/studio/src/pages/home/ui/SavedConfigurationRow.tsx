import { ArrowUpRight } from "lucide-react";
import type { SimulationConfiguration, UserProfileId } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

export function SavedConfigurationRow({ item, selected, onSelect, onSelectUser }: Readonly<{
  item: SimulationConfiguration; selected: boolean; onSelect: () => void; onSelectUser: (id: UserProfileId) => void;
}>) {
  return <tr className={`border-b border-separator last:border-b-0 ${selected ? "bg-accent-subtle" : ""}`}>
    <td className="max-w-64 px-5 py-3 sm:px-6">
      <button type="button" onClick={onSelect} aria-haspopup="dialog" aria-controls={selected ? "simulation-details" : undefined}
        className="group inline-flex max-w-full items-center gap-2 rounded-sm text-left text-sm font-medium text-foreground hover:text-accent hover:underline focus-visible:underline">
        <span className="truncate">{item.name}</span><ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-muted group-hover:text-accent" />
      </button>
    </td>
    <td className="max-w-48 px-4 py-3"><a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="block truncate font-mono hover:text-accent hover:underline" title={item.targetUrl}>
      {new URL(item.targetUrl).host}<span className="sr-only"> (opens in a new tab)</span>
    </a></td>
    <td className="px-4 py-3"><span className="rounded-sm bg-accent-subtle px-2 py-1 text-accent">Saved</span></td>
    <td className="px-4 py-3"><div className="flex items-center gap-1" aria-label={`${item.userProfileIds.length} users`}>
      {item.userProfileIds.map(id => {
        const user = participantCatalog.find(option => option.profileId === id);
        return user ? <button key={id} type="button" onClick={() => onSelectUser(id)} aria-haspopup="dialog"
          aria-label={`View ${user.name}, ${user.profile}, in ${item.name}`} title={`${user.name} · ${user.profile}`}
          className="rounded-md hover:bg-surface-hover"><UserAvatar identity={user.id} className="size-7" /></button> : null;
      })}
    </div></td>
    <td className="px-6 py-3 text-right whitespace-nowrap">Not started</td>
  </tr>;
}
