import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { Link } from "react-router";
import type { SetupStep } from "@/pages/new-simulation/model/draft";

type Props = Readonly<{ step: SetupStep; onBack: () => void }>;

export function SetupActions({ step, onBack }: Props) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-5">
      {step === "target" ? (
        <Link to="/" className="rounded-sm text-sm text-muted hover:text-foreground">Cancel</Link>
      ) : (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-sm text-sm text-muted hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Back
        </button>
      )}
      {step === "summary" ? (
        <button
          type="button"
          disabled
          aria-describedby="execution-availability"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-disabled-surface px-4 py-2.5 text-sm font-medium text-disabled"
        >
          <Play aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Start simulation
        </button>
      ) : (
        <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
          {step === "target" ? "Continue to users" : "Continue to summary"}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
