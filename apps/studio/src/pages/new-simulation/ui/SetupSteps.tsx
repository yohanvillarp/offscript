import { CircleHelp, Globe, ListChecks, UsersRound } from "lucide-react";
import type { SetupStep } from "@/pages/new-simulation/model/draft";

const steps = [
  { id: "target", label: "Target", icon: Globe },
  { id: "participants", label: "Users", icon: UsersRound },
  { id: "summary", label: "Configuration summary", icon: ListChecks },
] as const;

export function SetupSteps({ active, onSelect, onHelp }: Readonly<{ active: SetupStep; onSelect: (step: SetupStep) => void; onHelp: () => void }>) {
  return (
    <nav aria-label="Simulation setup steps" className="border-b border-separator bg-surface">
      <div className="mx-auto flex max-w-(--layout-content-max)">
      <ol className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-separator border-x border-separator">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const selected = active === step.id;
          return (
            <li key={step.id}>
              <button type="button" aria-current={selected ? "step" : undefined} onClick={() => onSelect(step.id)} className={`flex min-h-18 w-full flex-col items-center justify-center gap-1.5 sm:min-h-16 sm:flex-row border-b-2 px-2 py-2 text-sm sm:gap-2 ${selected ? "border-accent bg-accent-subtle text-accent" : "border-transparent text-muted hover:bg-surface-subtle hover:text-foreground"}`}>
                <span className={`inline-flex size-6 shrink-0 items-center justify-center border font-mono text-xs ${selected ? "border-accent bg-accent text-accent-foreground" : "border-separator"}`}>{index + 1}</span>
                <Icon aria-hidden="true" className="hidden size-4 sm:block" strokeWidth={1.5} />
                <span className="min-w-0 text-center text-xs font-medium sm:text-sm">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex shrink-0 items-center px-1 sm:px-3">
        <button type="button" onClick={onHelp} aria-label="Simulation setup help" title="Simulation setup help" className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface-subtle hover:text-foreground">
          <CircleHelp aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      </div>
    </nav>
  );
}
