import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Cpu, ExternalLink, Terminal } from "lucide-react";
import { CodeBlock } from "@/shared/CodeBlock";
import { npmPackage } from "@/shared/links";
import { Section } from "@/shared/Section";

export function GetStarted() {
  const [tab, setTab] = useState<"npm" | "source">("npm");

  return (
    <Section id="get-started" className="guide" labelledBy="start-title">
      <div className="section-intro text-center">
        <p className="eyebrow justify-center">Get started</p>
        <h2 id="start-title">Up and running in three steps.</h2>
        <p>
          Install OFFSCRIPT, start your local target application, and launch Studio to explore from different user perspectives.
        </p>
      </div>

      <div className="guide-layout block-stack w-full">
        <aside className="guide-notes block-stack rounded-lg border border-separator bg-surface p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-accent" />
              <p className="small-label">Stable Release</p>
            </div>
            <p className="mt-2 text-sm text-foreground font-mono">v1.0.1 on npm</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Published package: <code>@nikelyh/offscript</code>
            </p>
            <a
              href={npmPackage}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              View on npm registry <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="border-t border-separator pt-5">
            <p className="small-label">System Prerequisites</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>• Node.js 24 or later</li>
              <li>• npm 11.19 or later</li>
              <li>• Chromium (via Playwright) for browser runs</li>
            </ul>
          </div>

          <div className="border-t border-separator pt-5">
            <p className="small-label">Safe Testing Rule</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Use a disposable or test database. Automated user agents perform real browser clicks that can create or mutate data.
            </p>
          </div>
        </aside>

        <div className="guide-content block-stack">
          {/* Method selector */}
          <div className="flex items-center gap-3 border-b border-separator pb-4">
            <button
              type="button"
              onClick={() => setTab("npm")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "npm"
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-muted hover:text-foreground border border-separator"
              }`}
            >
              <Terminal size={16} />
              Quick start via npm (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setTab("source")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === "source"
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface text-muted hover:text-foreground border border-separator"
              }`}
            >
              <Cpu size={16} />
              From source (Contributors)
            </button>
          </div>

          {tab === "npm" ? (
            <div className="block-stack">
              <article>
                <h3>
                  <span>1</span>Install OFFSCRIPT & Chromium
                </h3>
                <p>Install the global CLI tool and the required Chromium browser engine for exploration:</p>
                <CodeBlock code="npm install -g @nikelyh/offscript\nnpx playwright install chromium" />
                <p className="supporting-note">
                  Alternatively, run without global installation using <code>npx @nikelyh/offscript studio</code>.
                </p>
              </article>

              <article>
                <h3>
                  <span>2</span>Start your application & launch Studio
                </h3>
                <p>
                  Start your web app (for example at <code>http://localhost:3000</code> or <code>5173</code>), then run Studio in your project folder:
                </p>
                <CodeBlock code="offscript studio" />
                <p className="supporting-note">
                  Studio starts a secure loopback host and opens your browser. Use <code>offscript studio --no-open</code> to print the access URL without auto-launching.
                </p>
              </article>

              <article>
                <h3>
                  <span>3</span>Configure and explore
                </h3>
                <p>
                  In Studio, click <strong>New simulation</strong>. Enter your app URL (e.g. <code>http://localhost:3000</code>), write an exploration goal (e.g. <em>&quot;Test cart checkout and form validation&quot;</em>), select user profiles, and click <strong>Save &amp; Run</strong>.
                </p>
                <p className="supporting-note">
                  Inspect attributed observations, peer investigations, and visual screenshots in real time or via terminal with <code>offscript results &lt;id&gt;</code>.
                </p>
              </article>
            </div>
          ) : (
            <div className="block-stack">
              <article>
                <h3>
                  <span>1</span>Clone and install dependencies
                </h3>
                <p>Clone the repository and install dependencies using isolated workspaces:</p>
                <CodeBlock code="git clone https://github.com/yohanvillarp/offscript.git\ncd offscript\nnpm ci\nnpm --prefix apps/studio ci" />
              </article>

              <article>
                <h3>
                  <span>2</span>Test the Mozaik multi-agent demo
                </h3>
                <p>Watch two simulated user agents coordinate in a controlled environment without requiring a browser:</p>
                <CodeBlock code="npm run demo:mozaik" />
                <p className="supporting-note">
                  Verifies Mozaik runtime integration, turns, semantic observation broadcasting, and peer assignments.
                </p>
              </article>

              <article>
                <h3>
                  <span>3</span>Build distribution & run Studio
                </h3>
                <p>Build the local production bundle and launch Studio targeting any local project:</p>
                <CodeBlock code="npm run build:local\nnpm start -- studio --project &quot;/absolute/path/to/your-app&quot;" />
              </article>
            </div>
          )}

          <div className="rounded-lg border border-separator bg-surface-subtle p-5">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ExternalLink size={15} className="text-accent" />
              Need CLI assistance?
            </h4>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Run <code>offscript help</code> to view all commands, or <code>offscript help &lt;command&gt;</code> (e.g. <code>offscript help studio</code> or <code>offscript help results</code>) for flag references.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
