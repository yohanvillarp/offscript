import { defaultExecutionLimits } from "@offscript/contracts";
import type { ExecutionLimits as Limits } from "@offscript/contracts";

const fields: readonly { key: keyof Limits; label: string; maximum: number }[] = [
  { key: "maxTurnsPerAgent", label: "Turns per user", maximum: 100 },
  { key: "maxInferenceCallsPerTurn", label: "Inference calls per turn", maximum: 100 },
  { key: "inferenceTimeoutMs", label: "Inference timeout (ms)", maximum: 2_147_483_647 },
  { key: "durationMs", label: "Session duration (ms)", maximum: 2_147_483_647 },
];

export function ExecutionLimits({ value = defaultExecutionLimits, onChange }: Readonly<{ value?: Limits; onChange: (value: Limits) => void }>) {
  return (
    <details className="border-t border-separator pt-5">
      <summary className="cursor-pointer text-sm font-medium">Execution limits</summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(field => <label key={field.key} className="space-y-2 text-xs text-muted">
          <span className="block">{field.label}</span>
          <input type="number" min={1} max={field.maximum} step={1} value={Number.isFinite(value[field.key]) ? value[field.key] : ""}
            onChange={event => onChange({ ...value, [field.key]: event.target.value === "" ? Number.NaN : Number(event.target.value) })}
            className="w-full rounded-md border border-separator bg-surface px-3 py-2 font-mono text-sm text-foreground" />
        </label>)}
      </div>
      <p className="mt-3 text-xs text-muted">Stored for future execution. Inference timeout must not exceed session duration.</p>
    </details>
  );
}
