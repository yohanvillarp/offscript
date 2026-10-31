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
          Your saved simulation configurations will appear here.
        </p>
      </div>
    </div>
  );
}
