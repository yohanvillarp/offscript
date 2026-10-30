import type { DraftErrors, SimulationDraft } from "@/pages/new-simulation/model/draft";

export function validateTarget(draft: SimulationDraft): DraftErrors {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = "Enter a simulation name.";
  if (!draft.goal.trim()) errors.goal = "Describe what your users should accomplish.";
  try {
    const url = new URL(draft.url.trim());
    if (!/^https?:\/\//i.test(draft.url.trim()) || (url.protocol !== "http:" && url.protocol !== "https:")) errors.url = "Use an HTTP or HTTPS URL.";
    else if (url.username || url.password) errors.url = "Enter a URL without embedded credentials.";
  } catch {
    errors.url = "Enter a complete application URL, including http:// or https://.";
  }
  return errors;
}

export function validateParticipants(draft: SimulationDraft): DraftErrors {
  const errors: Record<string, string> = {};
  if (draft.participants.length === 0) errors.participants = "Select at least one user.";
  return errors;
}
