import { ArrowLeft } from "lucide-react";
import type { SimulationConfiguration } from "@offscript/contracts";
import type { ParticipantOption } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type Props = Readonly<{ item: SimulationConfiguration; user: ParticipantOption; onViewSimulation: () => void }>;

export function SimulationUserDetails({ item, user, onViewSimulation }: Props) {
  return <>
    <button type="button" onClick={onViewSimulation} className="inline-flex items-center gap-2 text-xs text-accent hover:underline">
      <ArrowLeft aria-hidden="true" className="size-3.5" />View simulation
    </button>
    <div>
      <UserAvatar identity={user.id} className="size-24" />
      <h2 id="simulation-detail-title" tabIndex={-1} className="mt-4 text-2xl font-semibold">{user.name}</h2>
      <p className="mt-2 text-sm text-muted">{user.profile}</p>
    </div>
    <dl className="space-y-6 text-sm">
      <div><dt className="text-xs text-muted">Behavior</dt><dd className="mt-2 leading-relaxed">{user.description}</dd></div>
      <div><dt className="text-xs text-muted">General intention</dt><dd className="mt-2 leading-relaxed">{user.intention}</dd></div>
      <div><dt className="text-xs text-muted">Assigned exploration goal</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{item.goal}</dd></div>
      <div><dt className="text-xs text-muted">Simulation</dt><dd className="mt-2 break-words">{item.name}</dd></div>
    </dl>
  </>;
}
