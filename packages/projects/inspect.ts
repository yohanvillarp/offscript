import { open, realpath, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { ProjectDescriptor } from "../contracts/index.ts";
import { suggestTarget } from "./suggest-target.ts";

export class ProjectInspectionError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "ProjectInspectionError"; }
}

export async function inspectProject(projectRoot: string): Promise<ProjectDescriptor> {
  try {
    if (!projectRoot.trim()) throw new ProjectInspectionError("An explicit project path is required.");
    const rootPath = await realpath(resolve(projectRoot));
    if (!(await stat(rootPath)).isDirectory()) throw new ProjectInspectionError("The project path must be a directory.");
    const fallback: ProjectDescriptor = Object.freeze({ rootPath, suggestedName: basename(rootPath) || "Project", nameSource: "directory" });
    let file;
    try { file = await open(join(rootPath, "package.json"), "r"); } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return fallback;
      throw error;
    }
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > 1_048_576) throw new ProjectInspectionError("Project manifest must be a regular file of at most 1 MiB.");
      const parsed: unknown = JSON.parse(await file.readFile({ encoding: "utf8" }));
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new ProjectInspectionError("Project manifest must contain a JSON object.");
      const name: unknown = "name" in parsed ? parsed.name : undefined;
      const targetSuggestion = suggestTarget(parsed);
      return Object.freeze({ ...(typeof name === "string" && name.trim() ? { rootPath, suggestedName: name.trim(), nameSource: "package" as const } : fallback),
        ...(targetSuggestion ? { targetSuggestion } : {}) });
    } finally { await file.close(); }
  } catch (cause) {
    if (cause instanceof ProjectInspectionError) throw cause;
    throw new ProjectInspectionError("Could not read the selected project.", { cause });
  }
}
