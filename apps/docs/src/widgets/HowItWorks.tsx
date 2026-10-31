import { Section } from "@/shared/Section";
import { ArrowDown, ArrowRight, Users, ScanSearch, Workflow } from "lucide-react";
import { sourceDoc } from "@/shared/links";

const stages = [
  { number: "01", title: "Set the intention", text: "Choose an authorized application, a concrete goal and the users who will explore it.", Icon: Users },
  { number: "02", title: "Explore different paths", text: "Mozaik coordinates user agents and reactive collaboration. Playwright provides separate browser contexts.", Icon: Workflow },
  { number: "03", title: "Follow the evidence", text: "Inspect attributed observations, investigations and available screenshots. Keep uncertainty visible.", Icon: ScanSearch },
];
export function HowItWorks() {
  return <Section id="how-it-works" labelledBy="how-title">
    <div className="section-intro text-center"><p className="eyebrow justify-center">How it works</p><h2 id="how-title">One goal. Different perspectives.</h2><p>Choose a goal, let users explore, and follow what they discover. Any user can notice a problem, regardless of their profile.</p></div>
    <div className="steps layout-grid grid-cols-1 md:grid-cols-3">{stages.map(({ number, title, text, Icon }) => <article key={number} className="rounded-lg border border-separator bg-surface p-6 sm:p-8"><div className="step-meta"><span>{number}</span><Icon size={20} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
    <div className="collaboration layout-grid grid-cols-1 items-start rounded-lg bg-surface-subtle p-6 sm:p-10 md:grid-cols-2">
      <div><p className="eyebrow">Built with Mozaik</p><h3>Users can build on each other’s observations.</h3><p>In the controlled demo, users share what they notice. An investigation request can bring another user into the conversation to look more closely.</p><a className="text-link" href={sourceDoc("MOZAIK-INTEGRATION.md")} target="_blank" rel="noreferrer">Read the integration notes<ArrowRight size={16} /></a></div>
      <figure className="flow"><div className="flow-users"><span>Beginner</span><span>Explorer</span></div><ArrowDown aria-hidden="true" /><div className="flow-state"><strong>Shared observations</strong><span>Context · attribution · correlation</span></div><ArrowDown aria-hidden="true" /><div className="flow-result">Request → Assignment → Investigation</div><figcaption>Conceptual collaboration flow. The demo uses deterministic inference; the normal browser path does too. Live, profile-driven exploration is not yet product-validated.</figcaption></figure>
    </div>
  </Section>;
}
