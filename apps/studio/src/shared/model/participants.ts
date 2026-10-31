import type { UserProfileId } from "@offscript/contracts";

export type ParticipantOption = Readonly<{
  id: string; name: string;
  profileId: UserProfileId;
  profile: string;
  description: string;
  intention: string;
}>;

// Presentation catalog; this does not configure runtime behavior or permissions.
export const participantCatalog: readonly ParticipantOption[] = [
  {
    id: "raven", name: "Raven", profile: "Explorer", profileId: "explorer",
    description: "Observant, curious, and experimental. Tries alternative paths and questions unexpected results.",
    intention: "Understand the system through exploration.",
  },
  {
    id: "fox", name: "Fox", profile: "Impatient", profileId: "impatient",
    description: "Quick, resourceful, and focused on results. Retries or finds another way when progress feels slow.",
    intention: "Complete tasks as quickly as possible.",
  },
  {
    id: "compass", name: "Compass", profile: "Beginner", profileId: "beginner",
    description: "Needs guidance and interprets instructions without prior product knowledge. May take unexpected paths.",
    intention: "Learn to use the product and accomplish a goal.",
  },
  {
    id: "sparrow", name: "Sparrow", profile: "Regular", profileId: "regular",
    description: "Conventional, practical, and habitual. Follows familiar paths and expects standard application behavior.",
    intention: "Complete typical workflows smoothly and comfortably.",
  },
  {
    id: "owl", name: "Owl", profile: "Meticulous", profileId: "meticulous",
    description: "Thorough, attentive, and precise. Examines fine print, validates input states, and double-checks confirmations.",
    intention: "Ensure accuracy and catch subtle discrepancies.",
  },
  {
    id: "badger", name: "Badger", profile: "Distrustful", profileId: "distrustful",
    description: "Skeptical, cautious, and vigilant. Scrutinizes permissions, unexpected redirects, and unclear data collection.",
    intention: "Protect user privacy and avoid misleading traps.",
  },
];

export function participantImage(id: string): string {
  return `/participants/${id}.png`;
}
