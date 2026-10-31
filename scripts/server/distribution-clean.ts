import { lstatSync, realpathSync, rmSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Only this checkout's generated distribution may be recursively removed.
const root = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const target = resolve(root, "dist");
if (dirname(target) !== root || basename(target) !== "dist" || relative(root, target) !== "dist") {
  throw new Error("Refusing to clean a path outside the checkout distribution.");
}
try {
  const info = lstatSync(target);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("Distribution output must be a real directory, not a link or file.");
  rmSync(target, { recursive: true });
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
