import { createLocalHost } from "../../packages/runtime/host.ts";
import { createHostAccessFile } from "./access-file.ts";

let requestStop: () => void = () => {};
const stopping = new Promise<void>(resolve => { requestStop = resolve; });
let interrupted = false;
function stop() { interrupted = true; requestStop(); }
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
let host: ReturnType<typeof createLocalHost> | undefined;
let access: ReturnType<typeof createHostAccessFile> | undefined;
try {
  const portText = process.env.OFFSCRIPT_PORT;
  if (portText !== undefined && !/^\d+$/.test(portText)) throw new Error("Invalid port configuration.");
  host = createLocalHost({ projectRoot: process.env.OFFSCRIPT_PROJECT_ROOT ?? process.cwd(),
    ...(process.env.OFFSCRIPT_DATA_DIRECTORY === undefined ? {} : { dataDirectory: process.env.OFFSCRIPT_DATA_DIRECTORY }),
    ...(portText === undefined ? {} : { port: Number(portText) }),
    onDiagnostic(code) { console.error(code); process.exitCode = 1; stop(); },
  });
  const origin = await host.start();
  if (!interrupted) {
    access = createHostAccessFile(host.config.dataDirectory, host.credentials());
    console.log(`OFFSCRIPT host: ${origin}`);
    console.log(`Local access credentials: ${access.path}`);
    console.log("Press Ctrl+C to stop. No exploration starts automatically.");
    await stopping;
  }
} catch {
  console.error("OFFSCRIPT host could not start. Check project, port, and storage configuration.");
  process.exitCode = 1;
} finally {
  try { await host?.close(); } catch {
    console.error("OFFSCRIPT host shutdown did not complete cleanly."); process.exitCode = 1;
  }
  try { access?.remove(); } catch {
    console.error("OFFSCRIPT host access file could not be removed."); process.exitCode = 1;
  }
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
