import type { TargetSuggestion } from "../contracts/index.ts";

/** Recognize only simple Vite scripts; never evaluate project configuration. */
export function suggestTarget(manifest: object): TargetSuggestion | undefined {
  const scripts: unknown = "scripts" in manifest ? manifest.scripts : undefined;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) return;
  for (const scriptName of ["dev", "start"]) {
    const script: unknown = scriptName in scripts ? Reflect.get(scripts, scriptName) : undefined;
    if (typeof script !== "string" || !/^vite(?:\s|$)/.test(script) || /[^\w\s.=:/-]/.test(script)) continue;
    const args = script.trim().split(/\s+/).slice(1);
    let port = "5173";
    let valid = true;
    let explicitPort = false;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--port" || arg?.startsWith("--port=")) {
        port = arg === "--port" ? args[++i] ?? "" : arg.slice(7);
        explicitPort = true;
        if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) valid = false;
      } else if (arg === "--host" || arg?.startsWith("--host=")) {
        const host = arg === "--host" && args[i + 1] && !args[i + 1]?.startsWith("--") ? args[++i] : arg?.slice(7);
        if (host && !["localhost", "127.0.0.1", "0.0.0.0"].includes(host)) valid = false;
      } else if (arg !== "--strictPort") valid = false;
    }
    if (valid) return Object.freeze({ url: `http://localhost:${Number(port)}/`, source: explicitPort ? "vite-script" : "vite-default", scriptName });
  }
  return;
}
