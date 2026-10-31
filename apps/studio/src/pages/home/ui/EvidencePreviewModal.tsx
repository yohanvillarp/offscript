import { useEffect, useState } from "react";
import { AlertCircle, Camera, Loader2, X } from "lucide-react";
import { loadEvidenceBlob } from "@/shared/api/studio";

type Props = Readonly<{
  simulationId: string;
  evidenceId: string;
  onClose: () => void;
}>;

export function EvidencePreviewModal({ simulationId, evidenceId, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    const abort = new AbortController();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    void loadEvidenceBlob(simulationId, evidenceId, abort.signal)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
        setLoading(false);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError("Could not load screenshot evidence.");
        setLoading(false);
      });

    return () => {
      active = false;
      abort.abort();
      window.removeEventListener("keydown", handleKeyDown);
      if (url) URL.revokeObjectURL(url);
    };
  }, [simulationId, evidenceId, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-separator bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-separator px-4 py-3 bg-surface-subtle">
          <div className="flex items-center gap-2">
            <Camera aria-hidden="true" className="size-4 text-accent" />
            <h2 id="evidence-modal-title" className="text-xs font-semibold text-foreground">
              Evidence preview
            </h2>
            <span className="font-mono text-[10px] text-muted rounded bg-surface px-1.5 py-0.5">
              {evidenceId}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence preview"
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-black/5 dark:bg-black/30 min-h-[300px]">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted">
              <Loader2 aria-hidden="true" className="size-6 animate-spin text-accent" />
              <span className="text-xs">Loading capture...</span>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-md bg-danger-subtle p-3 text-xs text-danger">
              <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {imageUrl && !loading && !error && (
            <img
              src={imageUrl}
              alt={`Evidence capture for ${evidenceId}`}
              className="max-h-[75vh] w-auto max-w-full rounded-md object-contain border border-separator/50 shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
