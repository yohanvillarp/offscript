import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
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

function assertSafeId(id: string, label: string): string {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid ${label}: identifiers must only contain alphanumeric characters, hyphens, and underscores.`);
  }
  return id;
}

export function createEvidenceStore(baseDir: string, maxScreenshotsPerSimulation = 50): EvidenceStore {
  const root = resolve(baseDir, "evidence");

  function getSimDir(simId: SimulationId): string {
    const safeId = assertSafeId(simId, "simulationId");
    const dir = resolve(root, safeId);
    if (!dir.startsWith(root)) {
      throw new Error("Path traversal violation: simulation directory outside evidence root.");
    }
    return dir;
  }

  function getFilePath(simId: SimulationId, evId: string): string {
    const dir = getSimDir(simId);
    const safeEvId = assertSafeId(evId, "evidenceId");
    const filePath = resolve(dir, `${safeEvId}.png`);
    if (!filePath.startsWith(dir)) {
      throw new Error("Path traversal violation: evidence file path outside simulation directory.");
    }
    return filePath;
  }

  return Object.freeze({
    async saveEvidence(simulationId: SimulationId, evidenceId: string, data: Buffer, contentType = "image/png"): Promise<void> {
      void contentType;
      const dir = getSimDir(simulationId);
      mkdirSync(dir, { recursive: true });

      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")) : [];
      if (files.length >= maxScreenshotsPerSimulation) {
        const filesWithMtime = files.map((fileName) => {
          const fullPath = join(dir, fileName);
          try {
            return { fullPath, mtimeMs: statSync(fullPath).mtimeMs };
          } catch {
            return { fullPath, mtimeMs: 0 };
          }
        });
        filesWithMtime.sort((a, b) => a.mtimeMs - b.mtimeMs);
        const oldest = filesWithMtime[0];
        if (oldest) rmSync(oldest.fullPath, { force: true });
      }

      const filePath = getFilePath(simulationId, evidenceId);
      writeFileSync(filePath, data);
    },

    async getEvidence(simulationId: SimulationId, evidenceId: string): Promise<EvidenceItem | undefined> {
      try {
        const filePath = getFilePath(simulationId, evidenceId);
        if (!existsSync(filePath)) return undefined;
        const data = readFileSync(filePath);
        return { data, contentType: "image/png" };
      } catch {
        return undefined;
      }
    },

    async deleteSimulationEvidence(simulationId: SimulationId): Promise<void> {
      try {
        const dir = getSimDir(simulationId);
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      } catch {
        // Safe fallback on invalid simulation identity
      }
    },
  });
}
