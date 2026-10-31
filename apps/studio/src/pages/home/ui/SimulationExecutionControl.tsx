import { useEffect, useRef, useState } from "react";
import { AlertCircle, Play, Square } from "lucide-react";
import type { SimulationExecutionStatus } from "@offscript/contracts";
import { inspectExecution, startControlledDemo, stopSimulation, StudioApiError } from "@/shared/api/studio";

type Props = Readonly<{
  simulationId: string;
  onBusy?: (busy: boolean) => void;
}>;

export function SimulationExecutionControl({ simulationId, onBusy }: Props) {
  const [status, setStatus] = useState<SimulationExecutionStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    const abort = new AbortController();
    void inspectExecution(simulationId, abort.signal)
      .then((result) => { if (!unmounted.current) setStatus(result); })
      .catch(() => {});
    return () => {
      unmounted.current = true;
      abort.abort();
    };
  }, [simulationId]);

  const phase = status?.phase ?? "idle";
  const isRunning = phase === "running" || phase === "starting" || phase === "stopping";

  useEffect(() => {
    if (!isRunning) {
      onBusy?.(false);
      return;
    }
    onBusy?.(true);
    const timer = setInterval(() => {
      void inspectExecution(simulationId)
        .then((result) => { if (!unmounted.current) setStatus(result); })
        .catch(() => {});
    }, 1500);
    return () => clearInterval(timer);
  }, [simulationId, isRunning, onBusy]);

  async function handleStart() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await startControlledDemo(simulationId);
      setStatus(result);
    } catch (cause) {
      if (cause instanceof StudioApiError) {
        setError(cause.code === "ALREADY_EXISTS" ? "Simulation is already executing." : cause.message);
      } else {
        setError("Could not start controlled demo.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await stopSimulation(simulationId);
      setStatus(result);
    } catch {
      setError("Could not stop execution.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="controlled-exploration-title" className="rounded-lg border border-separator bg-surface-subtle p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="controlled-exploration-title" className="text-xs font-semibold text-muted uppercase tracking-wider">
          Controlled exploration
        </h3>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          phase === "running" ? "bg-accent-subtle text-accent" :
          phase === "completed" ? "bg-accent/10 text-accent" :
          phase === "failed" || phase === "interrupted" ? "bg-danger-subtle text-danger" :
          "bg-surface text-muted"
        }`}>
          {phase === "running" ? "Running demo" : phase}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted leading-relaxed">
        Runs against the local simulated cart fixture. Does not contact the configured Application URL.
      </p>

      {status && phase !== "idle" && (
        <dl className="mt-3 space-y-1.5 border-t border-separator pt-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Turns executed</dt>
            <dd className="font-mono font-medium">{status.turnsCount}</dd>
          </div>
          {status.failureReason && (
            <div className="flex justify-between gap-4 text-danger">
              <dt>Reason</dt>
              <dd className="font-mono text-right">{status.failureReason}</dd>
            </div>
          )}
        </dl>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-danger-subtle p-2 text-xs text-danger">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4">
        {isRunning ? (
          <button
            type="button"
            disabled={loading || phase === "stopping"}
            onClick={handleStop}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-danger px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-danger/90 disabled:opacity-50"
          >
            <Square aria-hidden="true" className="size-3.5 fill-current" />
            <span>{phase === "stopping" ? "Stopping..." : "Stop execution"}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={loading || phase === "completed"}
            onClick={handleStart}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white shadow-xs hover:bg-accent/90 disabled:opacity-50"
          >
            <Play aria-hidden="true" className="size-3.5 fill-current" />
            <span>{loading ? "Starting..." : "Run controlled demo"}</span>
          </button>
        )}
      </div>
    </section>
  );
}
