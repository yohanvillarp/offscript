import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { RavenMascot } from "@/shared/ui/raven-mascot";
import { ExplorationGuide } from "@/pages/new-simulation/ui/ExplorationGuide";

export function SimulationIntroduction({ onContinue, returning }: Readonly<{ onContinue: () => void; returning: boolean }>) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <main id="configuration" className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-12">
      <RavenMascot state="observing" className="mb-6 size-40 sm:size-48" />
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight">Plan an exploration.</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
        Give autonomous users a goal in your application. Their different behaviors help reveal unexpected paths and friction that scripted tests can miss.
      </p>
      <ExplorationGuide />
      <button type="button" onClick={onContinue} className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
        {returning ? "Back to configuration" : "Configure simulation"}
        <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>
      <p className="mt-4 text-xs text-muted">Save your configuration locally. Execution is not available yet.</p>
    </main>
  );
}
