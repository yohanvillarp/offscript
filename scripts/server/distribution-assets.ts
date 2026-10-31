import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../packages/persistence/migrations/", import.meta.url));
const target = fileURLToPath(new URL("../../dist/packages/persistence/migrations/", import.meta.url));
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

const studioSource = fileURLToPath(new URL("../../apps/studio/dist/", import.meta.url));
const studioTarget = fileURLToPath(new URL("../../dist/studio/", import.meta.url));
mkdirSync(studioTarget, { recursive: true });
cpSync(studioSource, studioTarget, { recursive: true });
