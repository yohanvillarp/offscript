import { ArrowDown, ArrowUpRight } from "lucide-react";
import { RavenMascot } from "@studio/shared/ui/raven-mascot/RavenMascot";
import { repository } from "@/shared/links";
import { Section } from "@/shared/Section";

export function Hero() {
  return (
    <Section className="hero" labelledBy="hero-title">
      <h1 id="hero-title">
        Your users don't follow a script.
        <span>Neither do ours.</span>
      </h1>
      <p className="hero-subtitle">
        Explore your application through different user perspectives. Share observations, investigate unexpected behavior, and inspect the evidence.
      </p>
      <div className="actions">
        <a className="primary-link" href="#get-started">
          Explore the guide<ArrowDown size={16} />
        </a>
        <a className="text-link" href={repository} target="_blank" rel="noreferrer">
          View source<ArrowUpRight size={16} />
        </a>
      </div>
      <RavenMascot
        state="observing"
        className="hero-mascot"
        label="OFFSCRIPT raven, observing its surroundings"
      />
    </Section>
  );
}
