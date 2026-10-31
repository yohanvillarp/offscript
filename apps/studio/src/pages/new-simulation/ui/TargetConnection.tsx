import { ArrowRight, LoaderCircle, PlugZap } from "lucide-react";
import { parseLocalTargetUrl } from "@offscript/contracts";
import { useTargetConnection } from "@/pages/new-simulation/model/useTargetConnection";

export function TargetConnection({ url }: Readonly<{ url: string }>) {
  const { state, check } = useTargetConnection(url);
  let local = false;
  try { parseLocalTargetUrl(url); local = true; } catch { /* Remote targets remain editable and saveable. */ }
  const result = state?.result;
  const response = result?.kind === "response" ? result.statusCode : undefined;
  const message = response ? response < 300 ? `Responding · HTTP ${response}` : response < 400 ? `Redirect · HTTP ${response}. Destination was not checked.` : `Responding with an error · HTTP ${response}` :
    result?.kind === "timeout" ? "Timed out. Check that your application is running." :
    result?.kind === "tls-error" ? "TLS verification failed. Check the application's certificate." :
    result?.kind === "busy" ? "Another check is in progress. Try again shortly." :
    result?.kind === "unreachable" ? "Could not connect. Start your application and check the address." : undefined;
  return <div className="space-y-2">
    <button type="button" onClick={() => void check()} disabled={!local || state?.checking}
      className="inline-flex items-center gap-2 text-xs font-medium text-accent disabled:text-muted">
      {state?.checking ? <LoaderCircle aria-hidden="true" className="size-3.5 motion-safe:animate-spin" /> : <PlugZap aria-hidden="true" className="size-3.5" />}
      {state?.checking ? "Checking…" : "Check connection"}<ArrowRight aria-hidden="true" className="size-3" />
    </button>
    <p role="status" className="text-xs leading-relaxed text-muted">{state?.error ?? message ??
      (local ? "Checks availability only. Your application must be started separately." : "Connection checks support localhost, 127.0.0.1, and [::1]. You can still save another URL.")}</p>
  </div>;
}
