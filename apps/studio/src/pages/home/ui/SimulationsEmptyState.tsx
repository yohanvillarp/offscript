import { ArrowDown } from "lucide-react";
import { RavenMascot } from "@/shared/ui/raven-mascot";

export function SimulationsEmptyState() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 py-10 text-center sm:px-6 sm:py-12">
      <RavenMascot state="observing" className="size-40 shrink-0 sm:size-44" />
      <div className="max-w-md">
        <h3 id="simulation-empty-title" className="text-2xl font-medium leading-tight tracking-tight text-foreground">
          No simulations yet.
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your simulations and their results will appear here.
        </p>
        <a
          href="#simulation-guide"
          className="mt-5 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-accent underline-offset-4 hover:text-accent-hover hover:underline"
        >
          How simulations work
          <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}
