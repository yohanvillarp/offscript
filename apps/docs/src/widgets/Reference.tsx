import { Section } from "@/shared/Section";
import { ArrowUpRight } from "lucide-react";
import { sourceDoc } from "@/shared/links";

const commands = [
  ["studio", "Start the protected local host and Studio."],
  ["serve", "Start the API host without Studio."],
  ["list", "List simulations saved in the selected project."],
  ["results <id>", "Inspect findings, observations and investigations."],
  ["recover <id>", "Explicitly settle an interrupted simulation."],
];
const concepts = [
  ["Observation", "What a user noticed, recorded with attribution."],
  ["Suspicion", "A hypothesis that something might be wrong."],
  ["Investigation", "A focused effort to find supporting or contradicting evidence."],
  ["Finding", "A conclusion subject to explicit verification criteria, beyond an agent’s assertion."],
];
export function Reference() {
  return <Section id="reference" labelledBy="reference-title">
    <div className="section-intro text-center"><p className="eyebrow justify-center">Reference</p><h2 id="reference-title">Commands and concepts.</h2></div>
    <div className="reference-grid layout-grid grid-cols-1 md:grid-cols-2">
      <div className="rounded-lg border border-separator bg-surface p-6 sm:p-8"><h3>The command line</h3><p>Run <code>offscript --help</code> after installing the local archive. From source, use <code>npm start --</code> before a command.</p><dl className="commands">{commands.map(([command, description]) => <div key={command}><dt><code>{command}</code></dt><dd>{description}</dd></div>)}</dl><p className="reference-note"><code>--project</code> selects the target project. <code>--no-open</code> keeps startup unattended. Help and version do not start a host.</p></div>
      <div className="rounded-lg border border-separator bg-surface p-6 sm:p-8"><h3>A discovery is a starting point</h3><dl className="concepts">{concepts.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl><a className="text-link" href={sourceDoc("INVESTIGATIONS.md")} target="_blank" rel="noreferrer">Investigations and confidence<ArrowUpRight size={16} /></a></div>
    </div>
    <div className="boundaries"><p className="small-label">Current boundaries</p><p>OFFSCRIPT complements regression tests. It does not guarantee defect discovery, exhaustive coverage or safe execution of every business action. Target startup, general action-policy enforcement and automatic agent resumption remain future work. Local storage does not imply offline model inference.</p><a href={sourceDoc("CONSOLIDATION.md")} target="_blank" rel="noreferrer">Read the validation boundaries<ArrowUpRight size={14} /></a></div>
  </Section>;
}
