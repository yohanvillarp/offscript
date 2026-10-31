import type { SimulationConfiguration } from "@offscript/contracts";

export function SavedConfigurationRow({ item }: Readonly<{ item: SimulationConfiguration }>) {
  return <tr className="border-b border-separator last:border-b-0">
    <td className="px-5 py-4 align-top sm:px-6">
      <details>
        <summary className="cursor-pointer text-sm font-medium text-foreground">{item.name}</summary>
        <dl className="mt-3 max-w-sm space-y-3 text-xs">
          <div><dt>Goal</dt><dd className="mt-1 whitespace-pre-wrap break-words text-foreground">{item.goal}</dd></div>
          <div><dt>Project</dt><dd className="mt-1 break-all font-mono">{item.projectRoot}</dd></div>
          <div><dt>ID</dt><dd className="mt-1 break-all font-mono">{item.simulationId}</dd></div>
          <div><dt>Limits</dt><dd className="mt-1">{item.limits.maxTurnsPerAgent} turns per user · {item.limits.maxInferenceCallsPerTurn} calls per turn · {item.limits.durationMs} ms duration</dd></div>
        </dl>
      </details>
    </td>
    <td className="max-w-xs px-4 py-4 align-top"><span className="block break-all font-mono">{item.targetUrl}</span><span className="mt-1 block capitalize">{item.environment.deployment}</span></td>
    <td className="px-4 py-4 align-top"><span className="rounded-sm bg-accent-subtle px-2 py-1 text-accent">Saved</span></td>
    <td className="px-4 py-4 align-top" title={item.userProfileIds.join(", ")}>{item.userProfileIds.length}</td>
    <td className="px-6 py-4 text-right align-top whitespace-nowrap">Not started</td>
  </tr>;
}
