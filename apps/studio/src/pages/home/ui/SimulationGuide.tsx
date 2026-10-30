import { Fingerprint, Globe, ScanSearch } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Globe,
    title: "Choose a target.",
    description: "Choose an application and define where agents can explore.",
  },
  {
    number: "02",
    icon: Fingerprint,
    title: "Choose users.",
    description: "Set profiles, goals, and permitted actions.",
  },
  {
    number: "03",
    icon: ScanSearch,
    title: "Review the evidence.",
    description: "Review interactions, observations, and supporting evidence.",
  },
] as const;

export function SimulationGuide() {
  return (
    <section id="simulation-guide" aria-labelledby="simulation-guide-title" className="scroll-mt-8 pt-10 sm:pt-12">
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="simulation-guide-title" className="text-base font-medium">How simulations work</h2>
      </div>
      <ol className="grid gap-7 md:grid-cols-3 md:gap-0">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.number} className="border-separator md:border-l md:px-7 md:first:border-l-0 md:first:pl-0 md:last:pr-0">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-accent-subtle text-accent">
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
                </span>
                <span className="font-mono text-xs text-muted">{step.number}</span>
              </div>
              <h3 className="text-base font-medium">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
