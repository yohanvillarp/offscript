import { DomainError, nonBlank } from "./errors.ts";
import type { AgentId } from "./identity.ts";
import { agentId } from "./identity.ts";
import { createAgentProfile } from "./profile.ts";
import type { AgentProfile } from "./profile.ts";

// Participation in a simulation. Finishing one model turn does not complete participation.
// "completed" records an ended participation, not proof that its goals were achieved.
export type AgentLifecycle =
  | Readonly<{ status: "ready" | "running" | "completed" | "cancelled" }>
  | Readonly<{ status: "failed"; reason: string }>;

export type Agent = Readonly<{
  id: AgentId;
  profile: AgentProfile;
  lifecycle: AgentLifecycle;
}>;

export function createAgent(id: AgentId, profile: AgentProfile): Agent {
  return Object.freeze({
    id: agentId(id),
    profile: createAgentProfile(profile),
    lifecycle: Object.freeze({ status: "ready" as const }),
  });
}

export function transitionAgent(agent: Agent, next: AgentLifecycle): Agent {
  const current = agent.lifecycle.status;
  const allowed = current === "ready"
    ? next.status === "running" || next.status === "cancelled"
    : current === "running" && ["completed", "failed", "cancelled"].includes(next.status);
  if (!allowed) {
    throw new DomainError("INVALID_TRANSITION", `Agent cannot move from ${current} to ${next.status}.`);
  }
  const lifecycle: AgentLifecycle = next.status === "failed"
    ? Object.freeze({ status: "failed", reason: nonBlank(next.reason, "Failure reason") })
    : Object.freeze({ status: next.status });
  return Object.freeze({ ...agent, lifecycle });
}
