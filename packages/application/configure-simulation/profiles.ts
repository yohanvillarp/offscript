import { agentId, createAgent, createAgentProfile, createSimulation } from "../../domain/index.ts";
import type { SimulationConfiguration, UserProfileId } from "../../contracts/index.ts";

const behaviors: Readonly<Record<UserProfileId, Readonly<{ name: string; personality: string }>>> = Object.freeze({
  explorer: Object.freeze({ name: "Explorer", personality: "Observant, curious, and experimental; tries alternative paths and questions unexpected results." }),
  impatient: Object.freeze({ name: "Impatient", personality: "Quick, resourceful, and focused on results; retries or finds alternatives when progress feels slow." }),
  beginner: Object.freeze({ name: "Beginner", personality: "Needs guidance and interprets instructions without prior product knowledge; may make unexpected choices." }),
  regular: Object.freeze({ name: "Regular", personality: "Conventional, practical, and habitual; follows familiar application patterns and expects common user flows." }),
  meticulous: Object.freeze({ name: "Meticulous", personality: "Thorough, attentive, and precise; examines fine print, validates input states, and double-checks confirmations." }),
  distrustful: Object.freeze({ name: "Distrustful", personality: "Skeptical, cautious, and vigilant; looks out for deceptive designs, unintended data disclosures, and unprompted charges." }),
});

export function configuredSimulation(configuration: SimulationConfiguration) {
  return createSimulation(configuration.simulationId, configuration.environment, configuration.userProfileIds.map(id => {
    const behavior = behaviors[id];
    return createAgent(agentId(id), createAgentProfile({ ...behavior,
      goals: [{ description: configuration.goal }], capabilities: [] }));
  }));
}
