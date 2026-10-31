import { useRef, useState } from "react";
import { ContractValidationError, parseSimulationSetup, defaultExecutionLimits } from "@offscript/contracts";
import type { SimulationConfiguration } from "@offscript/contracts";
import type { SimulationDraft } from "@/pages/new-simulation/model/draft";
import { participantCatalog } from "@/pages/new-simulation/model/participants";
import { saveConfiguration } from "@/shared/api/studio";

export function useSaveSimulation() {
  const attempt = useRef<{ id: string; fingerprint: string } | undefined>(undefined);
  const active = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SimulationConfiguration>();
  const [error, setError] = useState<string>();
  async function save(draft: SimulationDraft) {
    if (active.current) return;
    active.current = true; setSaving(true); setError(undefined);
    try {
      const setup = parseSimulationSetup({ name: draft.name, targetUrl: draft.url, goal: draft.goal,
        environment: { kind: "web", deployment: draft.environment }, limits: draft.limits ?? defaultExecutionLimits,
        userProfileIds: draft.participants.map(user => participantCatalog.find(option => option.id === user.id)?.profileId),
      });
      const fingerprint = JSON.stringify(setup);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { id: crypto.randomUUID(), fingerprint };
      setSaved(await saveConfiguration(attempt.current.id, setup));
    } catch (cause) {
      if (cause instanceof ContractValidationError) {
        const messages: Record<string, string> = {
          "setup.limits.maxTurnsPerAgent": "Turns per user must be a whole number between 1 and 100.",
          "setup.limits.maxInferenceCallsPerTurn": "Inference calls per turn must be a whole number between 1 and 100.",
          "setup.limits.durationMs": "Session duration must be a positive whole number of milliseconds, at most 2147483647.",
          "setup.limits.inferenceTimeoutMs": "Inference timeout must be positive and no longer than the session duration.",
        };
        setError(messages[cause.path] ?? "Review the target, goal, and selected users before saving.");
      } else setError(cause instanceof Error ? cause.message : "Could not save the simulation.");
    }
    finally { active.current = false; setSaving(false); }
  }
  return { save, saving, saved, error };
}
