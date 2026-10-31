import { Check } from "lucide-react";
import { Link } from "react-router";
import type { SimulationConfiguration } from "@offscript/contracts";

export function SavedSimulation({ configuration }: Readonly<{ configuration: SimulationConfiguration }>) {
  return <section id="configuration" tabIndex={-1} role="status" className="space-y-5 py-8">
    <Check aria-hidden="true" className="size-7 text-accent" />
    <h2 className="text-2xl font-medium">Simulation saved</h2>
    <p className="text-lg">{configuration.name}</p>
    <dl className="space-y-3 text-xs text-muted">
      <div><dt>Project</dt><dd className="mt-1 break-all font-mono">{configuration.projectRoot}</dd></div>
      <div><dt>Application URL</dt><dd className="mt-1 break-all font-mono">{configuration.targetUrl}</dd></div>
      <div><dt>Simulation ID</dt><dd className="mt-1 break-all font-mono">{configuration.simulationId}</dd></div>
    </dl>
    <p className="text-sm text-muted">The configuration is stored locally. No agents or application services have been started.</p>
    <Link to="/" className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover">View saved simulations</Link>
  </section>;
}
