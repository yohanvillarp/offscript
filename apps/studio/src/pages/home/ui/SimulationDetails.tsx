import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, FileSearch, X } from "lucide-react";
import type { SimulationConfiguration, UserProfileId } from "@offscript/contracts";
import { participantCatalog } from "@/shared/model/participants";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { SimulationUserDetails } from "@/pages/home/ui/SimulationUserDetails";
import { SimulationExecutionControl } from "@/pages/home/ui/SimulationExecutionControl";
import { SimulationResultsView } from "@/pages/home/ui/SimulationResultsView";
import { DeleteSimulation } from "@/pages/home/ui/DeleteSimulation";

type Props = Readonly<{
  item: SimulationConfiguration; position: number; total: number;
  selectedUser: UserProfileId | undefined; onSelectUser: (id: UserProfileId | undefined) => void;
  onSelect: (offset: number) => void; onClose: () => void;
  onDeleted: (id: string) => void;
}>;

export function SimulationDetails({ item, position, total, selectedUser, onSelectUser, onSelect, onClose, onDeleted }: Props) {
  const [activeTab, setActiveTab] = useState<"execution" | "results">("execution");
  const [deleting, setDeleting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const busy = deleting || executing;
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const user = selectedUser !== undefined && item.userProfileIds.includes(selectedUser) ? participantCatalog.find(option => option.profileId === selectedUser) : undefined;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
    content.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [item.simulationId, selectedUser, activeTab]);
  return <dialog ref={dialog} id="simulation-details" aria-labelledby="simulation-detail-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}
    className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-0 border-l border-separator bg-surface p-0 text-foreground backdrop:bg-canvas/70 sm:max-w-(--layout-detail-width)">
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-separator px-6 py-4">
        <p className="text-xs text-muted">{user ? "User details" : "Simulation details"}</p>
        <button type="button" disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close details" className="rounded-md p-2 text-muted enabled:hover:bg-surface-hover enabled:hover:text-foreground disabled:opacity-50"><X aria-hidden="true" className="size-4" /></button>
      </header>

      {!user && (
        <nav aria-label="Detail views" className="flex shrink-0 border-b border-separator px-6 bg-surface">
          <button
            type="button"
            onClick={() => setActiveTab("execution")}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-medium transition-colors ${
              activeTab === "execution"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Compass aria-hidden="true" className="size-3.5" />
            <span>Execution & Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("results")}
            className={`ml-5 flex items-center gap-2 border-b-2 py-3 text-xs font-medium transition-colors ${
              activeTab === "results"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <FileSearch aria-hidden="true" className="size-3.5" />
            <span>Results & Findings</span>
          </button>
        </nav>
      )}

      <div ref={content} className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-6 py-6">
        {user ? <SimulationUserDetails item={item} user={user} onViewSimulation={() => onSelectUser(undefined)} /> : activeTab === "execution" ? <>
        <div>
          <span className="rounded-sm bg-accent-subtle px-2 py-1 text-xs text-accent">Configuration</span>
          <h2 id="simulation-detail-title" tabIndex={-1} className="mt-4 break-words text-2xl font-semibold">{item.name}</h2>
          <p className="mt-2 text-xs capitalize text-muted">{item.environment.deployment} · Local exploration</p>
        </div>
        <SimulationExecutionControl simulationId={item.simulationId} targetUrl={item.targetUrl} onBusy={setExecuting} />
        <dl className="space-y-6 text-sm">
          <div><dt className="text-xs text-muted">Exploration goal</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{item.goal}</dd></div>
          <div><dt className="text-xs text-muted">Application URL</dt><dd className="mt-2 break-all font-mono text-xs">
            <a href={item.targetUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{item.targetUrl}<span className="sr-only"> (opens in a new tab)</span></a>
          </dd></div>
          <div><dt className="text-xs text-muted">Project</dt><dd className="mt-2 break-all font-mono text-xs">{item.projectRoot}</dd></div>
        </dl>
        <section aria-labelledby="detail-users"><h3 id="detail-users" className="text-xs text-muted">Users</h3>
          <ul className="mt-3 space-y-3">{item.userProfileIds.map(id => {
            const u = participantCatalog.find(option => option.profileId === id);
            return u ? <li key={id}><button type="button" disabled={busy} onClick={() => onSelectUser(id)} aria-label={`View ${u.name}, ${u.profile}`}
              className="flex w-full items-center gap-3 rounded-md p-1 text-left hover:bg-surface-hover"><UserAvatar identity={u.id} className="size-10" /><span><span className="block text-sm font-medium">{u.name}</span><span className="block text-xs text-muted">{u.profile}</span></span></button></li> : null;
          })}</ul>
        </section>
        <section aria-labelledby="detail-limits"><h3 id="detail-limits" className="text-xs text-muted">Execution limits</h3>
          <dl className="mt-3 space-y-3 text-xs">
            <div className="flex justify-between gap-4"><dt>Turns per user</dt><dd className="font-mono">{item.limits.maxTurnsPerAgent}</dd></div>
            <div className="flex justify-between gap-4"><dt>Inference calls per turn</dt><dd className="font-mono">{item.limits.maxInferenceCallsPerTurn}</dd></div>
            <div className="flex justify-between gap-4"><dt>Inference timeout</dt><dd className="font-mono">{item.limits.inferenceTimeoutMs / 1000} s</dd></div>
            <div className="flex justify-between gap-4"><dt>Session duration</dt><dd className="font-mono">{item.limits.durationMs / 1000} s</dd></div>
          </dl>
        </section>
        <div><p className="text-xs text-muted">Simulation ID</p><p className="mt-2 break-all font-mono text-xs">{item.simulationId}</p></div>
        <DeleteSimulation key={item.simulationId} id={item.simulationId} name={item.name} onBusy={setDeleting}
          onDeleted={() => { dialog.current?.close(); onDeleted(item.simulationId); }} />
        </> : <>
        <div>
          <h2 id="simulation-detail-title" tabIndex={-1} className="break-words text-2xl font-semibold">{item.name}</h2>
          <p className="mt-2 text-xs text-muted">Observations, findings and collaborative investigations recorded for this simulation.</p>
        </div>
        <SimulationResultsView simulationId={item.simulationId} refreshTrigger={executing ? "running" : "idle"} />
        </>}
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-separator px-6 py-4 text-xs text-muted">
        <span>{position + 1} of {total}</span><div className="flex gap-2">
          <button type="button" disabled={busy || position === 0} onClick={() => onSelect(-1)} aria-label="Previous simulation" className="rounded-md p-2 enabled:hover:bg-surface-hover disabled:opacity-40"><ChevronLeft aria-hidden="true" className="size-4" /></button>
          <button type="button" disabled={busy || position === total - 1} onClick={() => onSelect(1)} aria-label="Next simulation" className="rounded-md p-2 enabled:hover:bg-surface-hover disabled:opacity-40"><ChevronRight aria-hidden="true" className="size-4" /></button>
        </div>
      </footer>
    </div>
  </dialog>;
}
