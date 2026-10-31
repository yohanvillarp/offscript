import { simulationId } from "../../packages/domain/index.ts";
import { openPersistence } from "../../packages/persistence/index.ts";
import { evaluateFindingAssessment } from "../../packages/contracts/index.ts";
import type { CompletedInvestigationSummary } from "../../packages/contracts/index.ts";

export type CliOptions = Readonly<{
  projectRoot: string;
  dataDirectory?: string | undefined;
}>;

export async function executeListCommand(options: CliOptions): Promise<void> {
  const persistence = openPersistence({
    projectRoot: options.projectRoot,
    ...(options.dataDirectory !== undefined ? { dataDirectory: options.dataDirectory } : {}),
  });
  try {
    persistence.migrate();
    const list = await persistence.configurations.listConfigurations();
    if (list.length === 0) {
      console.log("No saved simulations found in this project.");
      return;
    }
    console.log(`Saved simulations (${list.length}):\n`);
    for (const sim of list) {
      console.log(`• ${sim.name} (${sim.simulationId})`);
      console.log(`  Target: ${sim.targetUrl}`);
      console.log(`  Goal:   ${sim.goal.split("\n")[0]}`);
      console.log(`  Users:  ${sim.userProfileIds.join(", ")}`);
      console.log("");
    }
  } finally {
    persistence.close();
  }
}

export async function executeResultsCommand(options: CliOptions & { simulationId: string }): Promise<void> {
  const persistence = openPersistence({
    projectRoot: options.projectRoot,
    ...(options.dataDirectory !== undefined ? { dataDirectory: options.dataDirectory } : {}),
  });
  try {
    persistence.migrate();
    const simId = simulationId(options.simulationId);
    const configuration = await persistence.configurations.findConfiguration(simId);
    if (!configuration) {
      console.error(`OFFSCRIPT: Simulation not found: ${options.simulationId}`);
      process.exitCode = 1;
      return;
    }
    const observations = await persistence.observations.listObservations(simId);
    const investigations = await persistence.investigations.listInvestigations(simId);
    const completed = investigations.filter((inv): inv is CompletedInvestigationSummary => inv.lifecycle.status === "completed");
    const findings = completed.map((inv) => evaluateFindingAssessment(inv, observations));

    console.log(`Simulation: ${configuration.name} (${configuration.simulationId})`);
    console.log(`Target:     ${configuration.targetUrl}`);
    console.log(`Goal:       ${configuration.goal}\n`);

    console.log(`--- Findings (${findings.length}) ---`);
    if (findings.length === 0) {
      console.log("  No completed findings recorded.");
    } else {
      for (const finding of findings) {
        const badge = finding.isConfirmedFinding
          ? "[CONFIRMED FINDING]"
          : finding.confidence === "provisional"
          ? "[PROVISIONAL]"
          : finding.confidence === "refuted"
          ? "[REFUTED]"
          : "[INCONCLUSIVE]";
        console.log(`  ${badge} ${finding.hypothesis}`);
        console.log(`    Outcome:      ${finding.outcome} (${finding.confidence})`);
        console.log(`    Explanation:  ${finding.explanation}`);
        if (finding.uncertaintyReason) {
          console.log(`    Uncertainty:  ${finding.uncertaintyReason}`);
        }
        console.log(`    Participants: ${finding.participatingAgents.join(", ")}`);
        if (finding.evidenceIds.length > 0) {
          console.log(`    Evidence:     ${finding.evidenceIds.join(", ")}`);
        }
        console.log("");
      }
    }

    console.log(`--- Observations (${observations.length}) ---`);
    if (observations.length === 0) {
      console.log("  No observations recorded.");
    } else {
      for (const obs of observations) {
        console.log(`  • [${obs.id}] by ${obs.agentId} at ${obs.context.location}`);
        console.log(`    ${obs.description}`);
        if (obs.evidenceIds.length > 0) {
          console.log(`    Evidence: ${obs.evidenceIds.join(", ")}`);
        }
      }
      console.log("");
    }

    console.log(`--- Investigations (${investigations.length}) ---`);
    if (investigations.length === 0) {
      console.log("  No investigations requested.");
    } else {
      for (const inv of investigations) {
        const status = inv.lifecycle.status;
        console.log(`  • [${inv.id}] (${status}) "${inv.hypothesis}"`);
        console.log(`    Requested by: ${inv.requestedBy}`);
        if (status !== "requested") {
          console.log(`    Assigned:     ${inv.lifecycle.agentIds.join(", ")}`);
        }
      }
      console.log("");
    }
  } finally {
    persistence.close();
  }
}
