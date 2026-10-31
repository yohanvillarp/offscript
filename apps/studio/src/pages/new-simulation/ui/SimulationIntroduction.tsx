import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { RavenMascot } from "@/shared/ui/raven-mascot";

export function SimulationIntroduction({ onContinue, returning }: Readonly<{ onContinue: () => void; returning: boolean }>) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <main id="configuration" className="mx-auto flex w-full max-w-2xl flex-col items-center px-5 py-12 text-center sm:py-16">
      <RavenMascot state="observing" className="mb-6 size-48" />
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight">Plan an exploration.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        Choose the application, select the users,
        then review the configuration.
      </p>
      <button type="button" onClick={onContinue} className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
        {returning ? "Back to configuration" : "Configure simulation"}
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>
      <p className="mt-4 text-xs text-muted">Save your configuration locally. Execution is not available yet.</p>
    </main>
  );
}
