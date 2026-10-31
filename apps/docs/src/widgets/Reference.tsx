import { Section } from "@/shared/Section";
import { ArrowUpRight, HelpCircle, Terminal, UserCheck } from "lucide-react";
import { sourceDoc } from "@/shared/links";

const commands = [
  ["studio", "Start the protected local host and Studio web interface (default)."],
  ["serve", "Start the API host in headless mode without launching Studio."],
  ["list", "List all simulations and configurations saved in the target project."],
  ["results <id>", "Inspect findings, observations, investigations, and visual evidence."],
  ["recover <id>", "Explicitly settle an interrupted simulation to failed or cancelled."],
  ["help [command]", "Display comprehensive CLI usage or help for a specific command."],
];

const concepts = [
  ["Observation", "What a user noticed during exploration, recorded with full provenance and timestamp."],
  ["Suspicion", "A working hypothesis that an interaction or state indicates unexpected behavior."],
  ["Investigation", "A focused collaborative effort by peer agents to gather supporting or contradicting evidence."],
  ["Finding", "A definitive conclusion evaluated against objective verification criteria, beyond an agent's claim."],
];

const profiles = [
  ["Explorer (Raven)", "Curious and thorough. Explores deep navigation, tests side branches, and inspects edge cases."],
  ["Impatient (Fox)", "Fast-paced and agile. Rapid clicks and quick actions that uncover race conditions or lagging UI."],
  ["Beginner (Compass)", "Needs clear visual affordances. Uncovers confusing layouts, vague error messages, or missing guides."],
  ["Regular (Sparrow)", "Follows typical happy paths and daily user habits, confirming essential functionality remains intact."],
  ["Meticulous (Owl)", "Exhaustive form and boundary tester. Enters edge values and inspects fine-grained layout consistency."],
  ["Distrustful (Badger)", "Adversarial skeptic. Tests defensive states, unusual sequences, and boundary failure modes."],
];

export function Reference() {
  return (
    <Section id="reference" labelledBy="reference-title">
      <div className="section-intro text-center">
        <p className="eyebrow justify-center">Reference</p>
        <h2 id="reference-title">Commands, concepts, and personas.</h2>
        <p>A quick reference to the OFFSCRIPT command line, exploration model, and user profiles.</p>
      </div>

      <div className="reference-grid layout-grid grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border border-separator bg-surface p-6 sm:p-8">
          <h3 className="flex items-center gap-2">
            <Terminal size={18} className="text-accent" />
            The Command Line
          </h3>
          <p>
            When installed via npm, run <code>offscript help</code>. From repository source, prepend <code>npm start --</code>.
          </p>
          <dl className="commands">
            {commands.map(([command, description]) => (
              <div key={command}>
                <dt>
                  <code>{command}</code>
                </dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
          <p className="reference-note text-xs text-muted">
            Flags: <code>--project &lt;dir&gt;</code> specifies the app directory; <code>--no-open</code> prevents launching a browser.
          </p>
        </div>

        <div className="rounded-lg border border-separator bg-surface p-6 sm:p-8">
          <h3 className="flex items-center gap-2">
            <HelpCircle size={18} className="text-accent" />
            Exploration Lifecycle
          </h3>
          <dl className="concepts">
            {concepts.map(([name, description]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
          <a
            className="text-link inline-flex items-center gap-1.5 text-sm text-accent hover:underline mt-4"
            href={sourceDoc("INVESTIGATIONS.md")}
            target="_blank"
            rel="noreferrer"
          >
            Investigations and confidence model <ArrowUpRight size={15} />
          </a>
        </div>
      </div>

      {/* Behavioral Profiles Grid */}
      <div className="rounded-lg border border-separator bg-surface p-6 sm:p-8">
        <h3 className="flex items-center gap-2 mb-2">
          <UserCheck size={18} className="text-accent" />
          Artificial User Profiles (Personas)
        </h3>
        <p className="text-sm text-muted mb-6">
          When creating a simulation, you select which artificial user perspectives explore your application:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(([name, desc]) => (
            <div key={name} className="rounded-md border border-separator bg-surface-subtle p-4">
              <h4 className="font-medium text-foreground text-sm font-mono text-accent">{name}</h4>
              <p className="mt-2 text-xs leading-relaxed text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="boundaries">
        <p className="small-label">Operational &amp; Safety Boundaries</p>
        <p>
          OFFSCRIPT complements automated regression suites and integration testing. It operates real browser sessions that may mutate backend data, so tests must be pointed at isolated, disposable environments. Target process startup, external credentials, and automatic resumption after unexpected shutdown remain explicit operator responsibilities.
        </p>
        <a href={sourceDoc("CONSOLIDATION.md")} target="_blank" rel="noreferrer">
          Read full validation boundaries <ArrowUpRight size={14} />
        </a>
      </div>
    </Section>
  );
}
