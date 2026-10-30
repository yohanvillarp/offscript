import { DomainError, nonBlank } from "./errors.ts";

export type AgentGoal = Readonly<{ description: string }>;

// A declaration of available behavior, never an authorization grant.
export type DeclaredCapability = string;

export type AgentProfile = Readonly<{
  name: string;
  personality: string;
  goals: readonly AgentGoal[];
  capabilities: readonly DeclaredCapability[];
}>;

export function createAgentProfile(input: AgentProfile): AgentProfile {
  nonBlank(input.name, "Profile name");
  nonBlank(input.personality, "Personality");
  if (input.goals.length === 0) {
    throw new DomainError("INVALID_VALUE", "A profile requires at least one goal.");
  }
  const goals = input.goals.map(({ description }) =>
    Object.freeze({ description: nonBlank(description, "Goal description") }),
  );
  const capabilities = input.capabilities.map((value) => nonBlank(value, "Capability"));
  if (new Set(capabilities).size !== capabilities.length) {
    throw new DomainError("INVALID_VALUE", "Declared capabilities must be unique.");
  }
  return Object.freeze({
    name: input.name,
    personality: input.personality,
    goals: Object.freeze(goals),
    capabilities: Object.freeze(capabilities),
  });
}
