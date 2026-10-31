import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SimulationId } from "../domain/index.ts";

export type EvidenceItem = Readonly<{
  data: Buffer;
  contentType: string;
}>;

export type EvidenceStore = Readonly<{
  saveEvidence(simulationId: SimulationId, evidenceId: string, data: Buffer, contentType?: string): Promise<void>;
  getEvidence(simulationId: SimulationId, evidenceId: string): Promise<EvidenceItem | undefined>;
  deleteSimulationEvidence(simulationId: SimulationId): Promise<void>;
}>;

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function createEvidenceStore(baseDir: string, maxScreenshotsPerSimulation = 50): EvidenceStore {
  const root = join(baseDir, "evidence");

  function simDir(simId: SimulationId): string {
    return join(root, sanitizeId(simId));
  }

  return Object.freeze({
    async saveEvidence(simulationId: SimulationId, evidenceId: string, data: Buffer, contentType = "image/png"): Promise<void> {
      void contentType;
      const dir = simDir(simulationId);
      mkdirSync(dir, { recursive: true });

      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : [];
      if (files.length >= maxScreenshotsPerSimulation) {
        const oldest = files.sort()[0];
        if (oldest) rmSync(join(dir, oldest), { force: true });
      }

      const filePath = join(dir, `${sanitizeId(evidenceId)}.png`);
      writeFileSync(filePath, data);
    },

    async getEvidence(simulationId: SimulationId, evidenceId: string): Promise<EvidenceItem | undefined> {
      const filePath = join(simDir(simulationId), `${sanitizeId(evidenceId)}.png`);
      if (!existsSync(filePath)) return undefined;
      try {
        const data = readFileSync(filePath);
        return { data, contentType: "image/png" };
      } catch {
        return undefined;
      }
    },

    async deleteSimulationEvidence(simulationId: SimulationId): Promise<void> {
      const dir = simDir(simulationId);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  });
}
