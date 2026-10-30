export const environments = ["local", "development", "test", "staging", "production"] as const;
export type DraftEnvironment = typeof environments[number];
export type SetupStep = "target" | "participants" | "summary";
export type ParticipantDraft = Readonly<{
  id: string;
  name: string;
}>;
export type SimulationDraft = Readonly<{
  name: string;
  url: string;
  goal: string;
  environment: DraftEnvironment;
  participants: readonly ParticipantDraft[];
}>;
export type DraftErrors = Readonly<Record<string, string>>;
