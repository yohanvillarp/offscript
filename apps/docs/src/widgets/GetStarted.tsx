import { Section } from "@/shared/Section";
import { ArrowUpRight } from "lucide-react";
import { CodeBlock } from "@/shared/CodeBlock";
import { repository } from "@/shared/links";

export function GetStarted() {
  return <Section id="get-started" className="guide" labelledBy="start-title">
    <div className="section-intro text-center"><p className="eyebrow justify-center">Get started</p><h2 id="start-title">Run your first demo.</h2><p>See Mozaik collaboration in a controlled environment. No browser, model account or API key required.</p></div>
    <div className="guide-layout block-stack w-full">
      <aside className="guide-notes block-stack rounded-lg border border-separator bg-surface p-6 sm:p-8">
        <div><p className="small-label">Requirements</p><p className="mt-3 text-sm leading-relaxed text-muted">Node.js 24+, npm and Git. For browser exploration, use your own disposable test environment.</p></div>
        <details className="release-note"><summary>Source preview — npm release pending</summary><p>Check the repository README for current installation issues before running these commands.</p><a href={`${repository}#readme`} target="_blank" rel="noreferrer">Latest release status<ArrowUpRight size={14} /></a></details>
      </aside>
      <div className="guide-content block-stack">
        <article><h3><span>1</span>Get the source</h3><CodeBlock code={'git clone https://github.com/yohanvillarp/offscript.git\ncd offscript\nnpm ci\nnpm --prefix apps/studio ci'} /></article>
        <article><h3><span>2</span>Watch the coordination</h3><p>Follow the observations, investigation request and assignment in your terminal.</p><CodeBlock code="npm run demo:mozaik" /><p className="supporting-note">Deterministic demo. Reported counts do not establish goal achievement.</p></article>
        <article><h3><span>3</span>Open your local Studio</h3><p>Configure and inspect simulations in your browser.</p><CodeBlock code={'npm run build:local\nnpm start -- studio --project "/absolute/path/to/your-app"'} /><p className="supporting-note">Use <code>--no-open</code> to print the entry file. Studio does not start agents or your application automatically.</p></article>
        <details className="browser-note"><summary>Ready to try a browser target?</summary><p>Install Chromium from the checkout, start your target separately, then configure its reachable URL in Studio. Use only an application and actions you are authorized to test.</p><CodeBlock code="npm exec -- playwright install chromium" /><p>Linux may also require Playwright system dependencies. The default browser runner uses deterministic decisions, so this is an integration trial rather than proof of autonomous exploration.</p></details>
      </div>
    </div>
  </Section>;
}
