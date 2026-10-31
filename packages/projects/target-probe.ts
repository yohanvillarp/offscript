import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { parseLocalTargetUrl } from "../contracts/index.ts";
import type { TargetConnection } from "../contracts/index.ts";
import type { TargetProbe } from "../application/index.ts";

/** Explicit, bounded checks; no DNS, redirects, cookies, or response bodies. */
export function createTargetProbe(): TargetProbe {
  let active = 0;
  return { async check(input, signal) {
    const url = parseLocalTargetUrl(input);
    signal?.throwIfAborted();
    if (active >= 2) return Object.freeze({ url, kind: "busy" });
    active++;
    try {
      return await new Promise<TargetConnection>((resolve, reject) => {
        const target = new URL(url);
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 2500);
        const abort = () => controller.abort();
        signal?.addEventListener("abort", abort, { once: true });
        const done = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); };
        let settled = false;
        function send(hostname: string) {
          const request = (target.protocol === "https:" ? httpsRequest : httpRequest)({
            protocol: target.protocol, hostname,
            port: target.port || (target.protocol === "https:" ? 443 : 80), method: "GET",
            path: target.pathname + target.search, headers: { Host: target.host, Accept: "text/html" },
            ...(target.protocol === "https:" && target.hostname === "localhost" ? { servername: "localhost" } : {}),
            agent: false, maxHeaderSize: 8192, signal: controller.signal,
          }, response => {
            settled = true;
            done();
            resolve(Object.freeze({ url, kind: "response", statusCode: response.statusCode ?? 500 }));
            response.destroy();
          });
          request.on("error", (error: NodeJS.ErrnoException) => {
            if (settled) return;
            if (target.hostname === "localhost" && hostname === "127.0.0.1" && error.code === "ECONNREFUSED" && !controller.signal.aborted) {
              send("::1"); return;
            }
            settled = true;
            done();
            if (signal?.aborted) { reject(signal.reason); return; }
            const tls = /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY/.test(error.code ?? "");
            resolve(Object.freeze({ url, kind: timedOut ? "timeout" : tls ? "tls-error" : "unreachable" }));
          });
          request.end();
        }
        send(target.hostname === "[::1]" ? "::1" : "127.0.0.1");
      });
    } finally { active--; }
  } };
}
