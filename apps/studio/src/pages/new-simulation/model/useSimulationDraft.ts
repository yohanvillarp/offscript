import { useCallback, useRef, useState } from "react";
import type { DraftErrors, ParticipantDraft, SetupStep, SimulationDraft } from "@/pages/new-simulation/model/draft";
import { validateParticipants, validateTarget } from "@/pages/new-simulation/model/validation";

export function useSimulationDraft() {
  const nameEdited = useRef(false);
  const [draft, setDraft] = useState<SimulationDraft>(() => ({
    name: "", url: "", goal: "", environment: "local", participants: [],
  }));
  const [step, setStep] = useState<SetupStep>("target");
  const [errors, setErrors] = useState<DraftErrors>({});

  const suggestName = useCallback((name: string) => {
    if (!nameEdited.current) setDraft(current => ({ ...current, name }));
  }, []);

  function updateTarget(patch: Partial<Omit<SimulationDraft, "participants">>) {
    if (patch.name !== undefined) nameEdited.current = true;
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in patch))));
  }

  function toggleParticipant(participant: ParticipantDraft) {
    setDraft((current) => ({ ...current, participants: current.participants.some((p) => p.id === participant.id)
      ? current.participants.filter((p) => p.id !== participant.id)
      : [...current.participants, participant] }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== "participants")));
  }

  function advance(): boolean {
    const targetErrors = validateTarget(draft);
    const participantErrors = validateParticipants(draft);
    const nextErrors = step === "target" ? targetErrors : { ...targetErrors, ...participantErrors };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStep(Object.keys(targetErrors).length ? "target" : "participants");
      return false;
    }
    setStep(step === "target" ? "participants" : "summary");
    return true;
  }

  return { draft, step, setStep, errors, updateTarget, toggleParticipant, advance, suggestName };
}
