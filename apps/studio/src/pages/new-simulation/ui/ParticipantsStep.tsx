import { UsersRound } from "lucide-react";
import type { DraftErrors, ParticipantDraft } from "@/pages/new-simulation/model/draft";
import { participantCatalog } from "@/pages/new-simulation/model/participants";
import { UserOption } from "@/pages/new-simulation/ui/UserOption";

type Props = Readonly<{
  participants: readonly ParticipantDraft[];
  errors: DraftErrors;
  onToggle: (participant: ParticipantDraft) => void;
}>;

export function ParticipantsStep({ participants, errors, onToggle }: Props) {
  return (
    <section aria-labelledby="users-heading" className="space-y-6">
      <div>
        <UsersRound aria-hidden="true" className="mb-4 size-5 text-accent" strokeWidth={1.5} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="users-heading" className="text-xl font-medium">Choose your users</h2>
          <span role="status" className="font-mono text-xs text-muted">{participants.length} selected</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">Select one or more artificial users to explore your application.</p>
      </div>
      <div role="group" aria-labelledby="users-heading" className="grid grid-cols-1 items-start gap-6 sm:grid-cols-3 sm:gap-8">
        {participantCatalog.map((user) => (
          <UserOption
            key={user.id}
            user={user}
            selected={participants.some((item) => item.id === user.id)}
            onToggle={() => onToggle(user)}
          />
        ))}
      </div>
      {errors.participants && <p id="participants" role="alert" tabIndex={-1} className="text-sm text-danger-text">{errors.participants}</p>}
    </section>
  );
}
