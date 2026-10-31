import { useEffect, useRef, useState } from "react";
import { AlertCircle, Compass, Sparkles, Square } from "lucide-react";
import { parseLocalTargetUrl } from "@offscript/contracts";
import type { SimulationExecutionStatus } from "@offscript/contracts";
import {
  checkTarget,
  inspectExecution,
  recoverSimulation,
  startBrowserExploration,
  startControlledDemo,
  stopSimulation,
  StudioApiError,
} from "@/shared/api/studio";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { ExecutionFailureAlert } from "./ExecutionFailureAlert";
import { AiEngineGuide } from "./AiEngineGuide";

type Props = Readonly<{
  simulationId: string;
  targetUrl?: string;
  onBusy?: (busy: boolean) => void;
}>;

export function SimulationExecutionControl({ simulationId, targetUrl, onBusy }: Props) {
  const [status, setStatus] = useState<SimulationExecutionStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [headless, setHeadless] = useState(false);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    const abort = new AbortController();
    void inspectExecution(simulationId, abort.signal).then((res) => { if (!unmounted.current) setStatus(res); }).catch(() => {});
    return () => { unmounted.current = true; abort.abort(); };
  }, [simulationId]);

  const phase = status?.phase ?? "idle";
  const isRunning = phase === "running" || phase === "starting" || phase === "stopping";
  const mode = status?.mode ?? "browser-exploration";

  useEffect(() => {
    if (!isRunning) { onBusy?.(false); return; }
    onBusy?.(true);
    const timer = setInterval(() => {
      void inspectExecution(simulationId).then((res) => { if (!unmounted.current) setStatus(res); }).catch(() => {});
    }, 1500);
    return () => clearInterval(timer);
  }, [simulationId, isRunning, onBusy]);

  async function handleStart(targetMode: "browser-exploration" | "controlled-demo") {
    setLoading(true);
    setError(undefined);
    try {
      if (targetMode === "browser-exploration" && targetUrl) {
        let isLocal = false;
        try {
          parseLocalTargetUrl(targetUrl);
          isLocal = true;
        } catch {
          // Remote URLs are allowed to proceed directly
        }
        if (isLocal) {
          const probe = await checkTarget(targetUrl, new AbortController().signal).catch(() => undefined);
          if (probe?.kind === "unreachable") {
            setError(`Cannot start exploration: target application at ${targetUrl} is unreachable. Please start your local development server (e.g. npm run dev) in another terminal.`);
            setLoading(false);
            return;
          }
        }
      }
      const result =
        targetMode === "browser-exploration"
          ? await startBrowserExploration(simulationId, { headless })
          : await startControlledDemo(simulationId);
      setStatus(result);
    } catch (cause) {
      if (cause instanceof StudioApiError) {
        setError(cause.code === "ALREADY_EXISTS" ? "Simulation is already executing." : cause.message);
      } else {
        setError("Could not start execution.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true); setError(undefined);
    try { setStatus(await stopSimulation(simulationId)); }
    catch { setError("Could not stop execution."); }
    finally { setLoading(false); }
  }

  async function handleRecover() {
    setLoading(true); setError(undefined);
    try { setStatus(await recoverSimulation(simulationId, "fail")); }
    catch { setError("Could not recover interrupted simulation."); }
    finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="execution-section-title" className="rounded-lg border-2 border-accent/40 bg-surface-subtle p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 id="execution-section-title" className="text-xs font-semibold text-muted uppercase tracking-wider">
          Exploration execution
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            phase === "running"
              ? "bg-accent-subtle text-accent"
              : phase === "completed"
              ? "bg-accent/10 text-accent"
              : phase === "failed" || phase === "interrupted"
              ? "bg-danger-subtle text-danger"
              : "bg-surface text-muted"
          }`}
        >
          {phase === "running" ? (mode === "browser-exploration" ? "Browser exploration" : "Running demo") : phase}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted leading-relaxed">
        {mode === "browser-exploration" && targetUrl
          ? `Runs automated browser exploration against ${targetUrl}. Requires your local application server to be running.`
          : "Runs against the local simulated cart fixture. Does not contact the configured Application URL."}
      </p>

      {status && phase !== "idle" && (
        <dl className="mt-3 space-y-1.5 border-t border-separator pt-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Turns executed</dt>
            <dd className="font-mono font-medium">{status.turnsCount}</dd>
          </div>
          {status.activeAgents.length > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Active users</dt>
              <dd className="font-mono">{status.activeAgents.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}

      {status?.failureReason && (
        <ExecutionFailureAlert reason={status.failureReason} />
      )}

      {status?.recentActivity && status.recentActivity.length > 0 && (
        <LiveActivityFeed activity={status.recentActivity} />
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-danger-subtle p-2 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {phase === "idle" && (
        <div className="mt-3 rounded-md border border-accent/30 bg-accent/10 p-3 text-xs leading-relaxed text-muted">
          <p className="flex items-center gap-1.5 font-semibold text-accent">
            <Sparkles aria-hidden="true" className="size-4 shrink-0" />
            <span>Ready for exploration</span>
          </p>
          <p className="mt-1">
            Click below to start autonomous users exploring <strong className="font-mono text-foreground">{targetUrl ?? "your application"}</strong>.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {isRunning ? (
          <button
            type="button"
            disabled={loading || phase === "stopping"}
            onClick={handleStop}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-danger px-3 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-danger/90 disabled:opacity-50"
          >
            <Square aria-hidden="true" className="size-3.5 fill-current" />
            <span>{phase === "stopping" ? "Stopping..." : "Stop execution"}</span>
          </button>
        ) : phase === "interrupted" ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleRecover}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-danger px-3 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-danger/90 disabled:opacity-50"
          >
            <Square aria-hidden="true" className="size-3.5 fill-current" />
            <span>{loading ? "Recovering..." : "Recover interrupted simulation"}</span>
          </button>
        ) : (
          <>
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted hover:text-foreground">
              <input
                type="checkbox"
                checked={!headless}
                onChange={(e) => setHeadless(!e.target.checked)}
                className="rounded border-separator text-accent focus:ring-accent"
              />
              <span>Show browser window on desktop (Headed mode)</span>
            </label>

            <button
              type="button"
              disabled={loading || phase === "completed"}
              onClick={() => handleStart("browser-exploration")}
              className={`flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-accent/90 disabled:opacity-50 transition-all ${
                phase === "idle" ? "ring-4 ring-accent/30 animate-pulse hover:animate-none" : ""
              }`}
            >
              <Compass aria-hidden="true" className="size-4" />
              <span>{loading ? "Starting exploration…" : "Run browser exploration"}</span>
            </button>

            <AiEngineGuide />

            <div className="pt-2 text-center border-t border-separator/40">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStart("controlled-demo")}
                className="text-[11px] text-muted hover:text-foreground hover:underline"
              >
                Need an offline sandbox instead? Run simulated cart demo
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
