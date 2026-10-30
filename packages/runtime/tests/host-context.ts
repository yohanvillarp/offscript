import type { TestContext } from "node:test";
import { createLocalHost } from "../host.ts";
import type { LocalHostOptions } from "../host.ts";
import { storage } from "../../persistence/tests/fixtures.ts";

export function hostContext(t: TestContext) {
  const hosts: ReturnType<typeof createLocalHost>[] = [];
  // Release hosted connections before the fixture removes its directory on Windows.
  t.after(async () => {
    for (const host of hosts) if (host.phase() !== "stopped") await host.close();
  });
  const temp = storage(t);
  return { ...temp, host(options: Partial<LocalHostOptions> = {}) {
    const host = createLocalHost({ projectRoot: temp.root, ...options });
    hosts.push(host);
    return host;
  } };
}

export async function eventually(check: () => boolean | Promise<boolean>) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("Expected condition did not settle.");
}
