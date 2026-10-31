import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Launch a local entry without interpreting paths as shell commands. */
export function openBrowser(path: string, platform: NodeJS.Platform = process.platform,
  launch: (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess = spawn): Promise<void> {
  const url = pathToFileURL(path).href;
  const command = platform === "win32" ? "rundll32.exe" : platform === "darwin" ? "open" : "xdg-open";
  const args = platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  return new Promise((resolve, reject) => {
    const child = launch(command, args, { shell: false, windowsHide: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error("Browser launcher failed.")));
  });
}
