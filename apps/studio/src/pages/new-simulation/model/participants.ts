import type { ParticipantDraft } from "@/pages/new-simulation/model/draft";
import type { UserProfileId } from "@offscript/contracts";

export type ParticipantOption = ParticipantDraft & Readonly<{
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
];

export function participantImage(id: string): string {
  return `/participants/${id}.png`;
}
