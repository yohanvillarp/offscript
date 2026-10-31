import { createLocalHost } from "../../packages/runtime/host.ts";
import { createControlledDemoSessionFactory } from "../../packages/orchestration/index.ts";
import { createHostAccessFile } from "./access-file.ts";
import { createStudioEntryFile } from "./studio-entry-file.ts";
import { openBrowser } from "./open-browser.ts";
import { startupError } from "./startup-error.ts";

process.env.MOZAIK_API_KEY ??= "";

let requestStop: () => void = () => {};
const stopping = new Promise<void>(resolve => { requestStop = resolve; });
let interrupted = false;
function stop() { interrupted = true; requestStop(); }
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
let host: ReturnType<typeof createLocalHost> | undefined;
let access: ReturnType<typeof createHostAccessFile> | undefined;
let studioEntry: ReturnType<typeof createStudioEntryFile> | undefined;
try {
  const portText = process.env.OFFSCRIPT_PORT;
  if (portText !== undefined && !/^\d+$/.test(portText)) throw new Error("Invalid port configuration.");
  host = createLocalHost({ projectRoot: process.env.OFFSCRIPT_PROJECT_ROOT ?? process.cwd(),
    sessionFactory: createControlledDemoSessionFactory(),
    ...(process.env.OFFSCRIPT_STUDIO_DIRECTORY ? { studioDirectory: process.env.OFFSCRIPT_STUDIO_DIRECTORY } : {}),
    ...(process.env.OFFSCRIPT_DATA_DIRECTORY === undefined ? {} : { dataDirectory: process.env.OFFSCRIPT_DATA_DIRECTORY }),
    ...(portText === undefined ? {} : { port: Number(portText) }),
    onDiagnostic(code) { console.error(code); process.exitCode = 1; stop(); },
  });
  const origin = await host.start();
  if (!interrupted) {
    access = createHostAccessFile(host.config.dataDirectory, host.credentials());
    console.log(`OFFSCRIPT host: ${origin}`);
    console.log(`Local access credentials: ${access.path}`);
    if (process.env.OFFSCRIPT_STUDIO_DIRECTORY) {
      studioEntry = createStudioEntryFile(host.config.dataDirectory, host.studioEntry());
      console.log(`Open this local file in your browser to enter Studio: ${studioEntry.path}`);
      console.log("The entry is single-use and expires in five minutes. Refreshing Studio keeps the browser session.");
      if (process.env.OFFSCRIPT_OPEN_BROWSER === "1") {
        void openBrowser(studioEntry.path).catch(() => {
          if (!interrupted) console.error("Could not open a browser. Open the printed local HTML entry manually; the host is still running.");
        });
      }
    }
    console.log("Press Ctrl+C to stop. No exploration starts automatically.");
    await stopping;
  }
} catch (error) {
  console.error(`OFFSCRIPT: ${startupError(error)}`);
  process.exitCode = 1;
} finally {
  try { await host?.close(); } catch {
    console.error("OFFSCRIPT host shutdown did not complete cleanly."); process.exitCode = 1;
  }
  try { access?.remove(); } catch {
    console.error("OFFSCRIPT host access file could not be removed."); process.exitCode = 1;
  }
  try { studioEntry?.remove(); } catch { console.error("Studio entry file could not be removed."); process.exitCode = 1; }
  process.off("SIGINT", stop);
  process.off("SIGTERM", stop);
}
