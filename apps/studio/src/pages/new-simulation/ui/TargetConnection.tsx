import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, PlugZap } from "lucide-react";
import { parseLocalTargetUrl } from "@offscript/contracts";
import { useTargetConnection } from "@/pages/new-simulation/model/useTargetConnection";

export function TargetConnection({ url }: Readonly<{ url: string }>) {
  const { state, check } = useTargetConnection(url);
  let local = false;
  try { parseLocalTargetUrl(url); local = true; } catch { /* Remote targets remain editable and saveable. */ }

  const result = state?.result;
  const response = result?.kind === "response" ? result.statusCode : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void check()}
          disabled={!local || state?.checking}
          className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:underline disabled:text-muted disabled:no-underline"
        >
          {state?.checking ? (
            <LoaderCircle aria-hidden="true" className="size-3.5 motion-safe:animate-spin" />
          ) : (
            <PlugZap aria-hidden="true" className="size-3.5" />
          )}
          {state?.checking ? "Checking…" : "Check connection"}
          <ArrowRight aria-hidden="true" className="size-3" />
        </button>
      </div>

      {state?.error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/40 bg-surface px-3 py-2 text-xs text-danger-text">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <div>
            <p className="font-medium">Could not reach OFFSCRIPT host</p>
            <p className="mt-0.5 text-muted">If the host was restarted or stopped, please reload this page or reopen Studio from the URL in your terminal.</p>
          </div>
        </div>
      ) : result?.kind === "response" && response ? (
        response < 300 ? (
          <div role="status" className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent">
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
            Responding · HTTP {response}
          </div>
        ) : response < 400 ? (
          <div role="status" className="inline-flex items-center gap-1.5 rounded-md border border-separator bg-surface px-2.5 py-1 text-xs text-muted">
            <AlertTriangle aria-hidden="true" className="size-3.5 text-warning" />
            Redirect · HTTP {response}. Destination was not checked.
          </div>
        ) : (
          <div role="status" className="rounded-md border border-separator bg-surface p-2.5 text-xs text-muted">
            <div className="flex items-center gap-1.5 font-medium text-warning-text">
              <AlertTriangle aria-hidden="true" className="size-3.5" />
              Responding with error · HTTP {response}
            </div>
            <p className="mt-1">Application replied with an error status code. Verify routing or authentication.</p>
          </div>
        )
      ) : result?.kind === "unreachable" ? (
        <div role="status" className="rounded-md border border-separator bg-surface p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-warning-text">
            <AlertTriangle aria-hidden="true" className="size-3.5" />
            Target application unreachable
          </div>
          <p className="mt-1 text-muted">
            Make sure your dev server is running in another terminal (e.g. <code className="font-mono text-foreground">npm run dev</code>). You can still proceed and save this simulation.
          </p>
        </div>
      ) : result?.kind === "timeout" ? (
        <div role="status" className="rounded-md border border-separator bg-surface p-2.5 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium text-warning-text">
            <AlertTriangle aria-hidden="true" className="size-3.5" />
            Timed out connecting to application
          </div>
          <p className="mt-1">Check that your dev server is responding promptly.</p>
        </div>
      ) : result?.kind === "tls-error" ? (
        <p role="status" className="text-xs leading-relaxed text-danger-text">TLS verification failed. Check the application&apos;s certificate.</p>
      ) : result?.kind === "busy" ? (
        <p role="status" className="text-xs leading-relaxed text-muted">Another check is in progress. Try again shortly.</p>
      ) : (
        <p role="status" className="text-xs leading-relaxed text-muted">
          {local
            ? "Checks availability only. Run your application in another terminal (e.g. npm run dev)."
            : "Connection checks support localhost, 127.0.0.1, and [::1]. You can still save another URL."}
        </p>
      )}
    </div>
  );
}
