import { AlertCircle, Terminal } from "lucide-react";

type Props = Readonly<{
  reason: string;
}>;

function describeFailure(reason: string): { title: string; hint: string; action?: string } {
  if (reason.includes("BROWSER_NAVIGATE") || reason.includes("CONNECTION_REFUSED")) {
    return {
      title: "Could not connect to target application",
      hint: "The browser could not reach your application. Verify your development server is active and accessible.",
      action: "Start your dev server (e.g. npm run dev) in another terminal.",
    };
  }
  if (reason.includes("SESSION_BUDGET_EXHAUSTED")) {
    return {
      title: "Exploration budget exhausted",
      hint: "The simulation reached its maximum allowed turns or session duration limit before completing.",
      action: "You can increase turn or duration limits in the simulation settings.",
    };
  }
  if (reason.includes("INTERRUPTED")) {
    return {
      title: "Simulation interrupted by host restart",
      hint: "The OFFSCRIPT host was restarted while this simulation was actively running.",
      action: "Use 'Recover' to clear the interrupted state.",
    };
  }
  if (reason.includes("CHROMIUM") || reason.includes("PLAYWRIGHT") || reason.includes("EXECUTABLE")) {
    return {
      title: "Chromium browser binary missing",
      hint: "Playwright requires the Chromium browser executable to run browser exploration.",
      action: "Run 'npx playwright install chromium' in your terminal.",
    };
  }
  if (reason.includes("INFERENCE")) {
    return {
      title: "Inference runner error",
      hint: "An error occurred during agent inference or decision processing.",
    };
  }
  return {
    title: "Exploration session stopped with error",
    hint: "The exploration session stopped unexpectedly. Check that your local application is running in another terminal.",
    action: "Check your local dev server terminal for connection errors.",
  };
}

export function ExecutionFailureAlert({ reason }: Props) {
  const detail = describeFailure(reason);
  return (
    <div role="alert" className="mt-3 rounded-md border border-danger/30 bg-surface p-3 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-danger">
        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
        <span>{detail.title}</span>
      </div>
      <p className="mt-1 text-muted leading-relaxed">{detail.hint}</p>
      {detail.action && (
        <div className="mt-2 flex items-center gap-1.5 font-medium text-foreground">
          <Terminal aria-hidden="true" className="size-3.5 text-accent shrink-0" />
          <span>{detail.action}</span>
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] text-faint">Diagnostic code: {reason}</p>
    </div>
  );
}
