import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteConfiguration } from "@/shared/api/studio";

type Props = Readonly<{ id: string; name: string; onDeleted: () => void; onBusy: (busy: boolean) => void }>;

export function DeleteSimulation({ id, name, onDeleted, onBusy }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (confirming) cancel.current?.focus(); }, [confirming]);

  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError(undefined); onBusy(true);
    try { await deleteConfiguration(id); onDeleted(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the simulation. Check the connection and try again.");
    } finally { inFlight.current = false; setPending(false); onBusy(false); }
  }

  return <section className="border-t border-separator pt-5" aria-label="Delete saved simulation" aria-busy={pending}>
    {confirming ? <div role="group" aria-labelledby="delete-simulation-title" className="space-y-3">
      <h3 id="delete-simulation-title" className="break-words text-sm font-medium">Delete “{name}”?</h3>
      <p className="text-xs leading-relaxed text-muted">This permanently removes its saved configuration and configured users. This cannot be undone.</p>
      <div className="flex flex-wrap gap-3">
        <button ref={cancel} type="button" disabled={pending} onClick={() => { setConfirming(false); setError(undefined); requestAnimationFrame(() => trigger.current?.focus()); }}
          className="rounded-md border border-separator px-3 py-2 text-xs">Cancel</button>
        <button type="button" disabled={pending} onClick={() => void remove()} className="rounded-md border border-danger px-3 py-2 text-xs text-danger-text disabled:opacity-50">
          {pending ? "Deleting…" : "Delete simulation"}
        </button>
      </div>
    </div> : <button ref={trigger} type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-sm text-xs text-danger-text hover:underline">
      <Trash2 aria-hidden="true" className="size-3.5" />Delete simulation
    </button>}
    {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-danger-text">{error}</p>}
  </section>;
}
