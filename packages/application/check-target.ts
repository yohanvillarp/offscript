import { parseLocalTargetUrl, parseTargetConnection } from "../contracts/index.ts";
import type { TargetConnection } from "../contracts/index.ts";

export type TargetProbe = Readonly<{ check(url: string, signal?: AbortSignal): Promise<TargetConnection> }>;

export async function executeCheckTarget(url: unknown, probe: TargetProbe, signal?: AbortSignal): Promise<TargetConnection> {
  return parseTargetConnection(await probe.check(parseLocalTargetUrl(url), signal));
}
