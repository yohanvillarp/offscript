import { Check, ChevronDown, Plus } from "lucide-react";
import type { ParticipantOption } from "@/pages/new-simulation/model/participants";
import { UserAvatar } from "@/pages/new-simulation/ui/UserAvatar";

type Props = Readonly<{
  user: ParticipantOption;
  selected: boolean;
  onToggle: () => void;
}>;

export function UserOption({ user, selected, onToggle }: Props) {
  const Icon = selected ? Check : Plus;

  return (
    <article aria-labelledby={`user-${user.id}`} className="flex min-w-0 flex-col items-center">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${selected ? "Deselect" : "Select"} ${user.profile}, ${user.name}`}
        onClick={onToggle}
        className="group flex w-full flex-col items-center rounded-md px-3 py-4 text-center"
      >
        <UserAvatar identity={user.id} className="size-36 sm:size-40 lg:size-44" />
        <span id={`user-${user.id}`} className="mt-5 text-lg font-medium">{user.profile}</span>
        <span className="mt-1 text-xs text-muted">{user.name}</span>
        <span className={`mt-4 inline-flex min-w-28 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-(--motion-fast) motion-reduce:transition-none ${selected ? "bg-accent text-accent-foreground" : "bg-surface text-muted group-hover:bg-surface-hover group-hover:text-foreground"}`}>
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
          {selected ? "Selected" : "Select"}
        </span>
      </button>
      <details className="group mt-1 w-full max-w-xs text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-sm px-2 py-2 text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span>About this user<span className="sr-only">: {user.profile}</span></span>
          <ChevronDown aria-hidden="true" className="size-3.5 group-open:rotate-180" strokeWidth={1.5} />
        </summary>
        <div className="mt-3 space-y-3 border-t border-separator pt-3 text-sm leading-relaxed text-muted">
          <p>{user.description}</p>
          <p><span className="font-medium text-foreground">Intention: </span>{user.intention}</p>
        </div>
      </details>
    </article>
  );
}
