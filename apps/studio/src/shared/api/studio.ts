import { parseProjectDescriptor, parseSimulationConfiguration, parseSimulationExecutionStatus, parseSimulationSetup } from "@offscript/contracts";
import type { SimulationConfiguration, SimulationExecutionStatus, SimulationSetup } from "@offscript/contracts";
import { parseTargetConnection } from "@offscript/contracts";


export class StudioApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = "StudioApiError"; this.code = code; }
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, credentials: "same-origin", headers: {
      "X-Offscript-Client": "studio", ...(options.body ? { "Content-Type": "application/json" } : {}),
    } });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw new StudioApiError("CONNECTION_FAILED", "Could not reach OFFSCRIPT. Check that the local host is still running.");
  }
  if (!response.ok) {
    if (response.status === 401) throw new StudioApiError("UNAUTHORIZED", "Open the local Studio entry file printed by OFFSCRIPT to connect.");
    if (options.method === "DELETE" && response.status === 409) throw new StudioApiError("DELETION_NOT_ALLOWED", "This simulation cannot be deleted: it has a session, execution state, or related data.");
    if (options.method === "DELETE" && response.status === 404) throw new StudioApiError("NOT_FOUND", "This saved simulation no longer exists. Close this panel and refresh the list.");
    if (options.method === "DELETE") throw new StudioApiError("DELETE_FAILED", "Could not confirm deletion. Refresh the list before trying again.");
    if (response.status === 409) throw new StudioApiError("ALREADY_EXISTS", "This simulation was already saved.");
    if (response.status === 400) throw new StudioApiError("INVALID_CONFIGURATION", "Review the target, selected users, and execution limits.");
    throw new StudioApiError("REQUEST_FAILED", "Could not load or save configuration. Open Studio through the OFFSCRIPT host and try again.");
  }
  return response.status === 204 ? undefined : response.json();
}

export async function deleteConfiguration(id: string): Promise<void> {
  await request(`/api/simulations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function loadProject(signal?: AbortSignal) {
  return parseProjectDescriptor(await request("/api/project", signal ? { signal } : {}));
}
export async function checkTarget(url: string, signal: AbortSignal) {
  return parseTargetConnection(await request("/api/target/check", { method: "POST", body: JSON.stringify({ url }), signal }));
}
export async function loadConfiguration(id: string) {
  return parseSimulationConfiguration(await request(`/api/simulations/${encodeURIComponent(id)}`));
}
export async function loadConfigurations(signal?: AbortSignal) {
  const result = await request("/api/simulations", signal ? { signal } : {});
  if (!Array.isArray(result)) throw new StudioApiError("INVALID_RESPONSE", "The local host returned an invalid configuration list.");
  return result.map((value: unknown) => parseSimulationConfiguration(value));
}
export async function saveConfiguration(id: string, setup: SimulationSetup): Promise<SimulationConfiguration> {
  const parsed = parseSimulationSetup(setup);
  try { await request("/api/simulations", { method: "POST", body: JSON.stringify({ simulationId: id, setup: parsed }) }); }
  catch (error) {
    if (!(error instanceof StudioApiError) || error.code !== "ALREADY_EXISTS") throw error;
  }
  const saved = await loadConfiguration(id);
  if (JSON.stringify(parseSimulationSetup({ name: saved.name, targetUrl: saved.targetUrl, goal: saved.goal,
    environment: saved.environment, userProfileIds: saved.userProfileIds, limits: saved.limits })) !== JSON.stringify(parsed)) {
    throw new StudioApiError("CONFLICT", "A different configuration already uses this identity. Return to simulations and review it.");
  }
  return saved;
}

export async function startControlledDemo(id: string): Promise<SimulationExecutionStatus> {
  const result = await request(`/api/simulations/${encodeURIComponent(id)}/start`, {
    method: "POST", body: JSON.stringify({ mode: "controlled-demo" }),
  });
  return parseSimulationExecutionStatus(result);
}

export async function inspectExecution(id: string, signal?: AbortSignal): Promise<SimulationExecutionStatus> {
  const result = await request(`/api/simulations/${encodeURIComponent(id)}/execution`, signal ? { signal } : {});
  return parseSimulationExecutionStatus(result);
}

export async function stopSimulation(id: string): Promise<SimulationExecutionStatus> {
  const result = await request(`/api/simulations/${encodeURIComponent(id)}/stop`, {
    method: "POST", body: JSON.stringify({}),
  });
  return parseSimulationExecutionStatus(result);
}

