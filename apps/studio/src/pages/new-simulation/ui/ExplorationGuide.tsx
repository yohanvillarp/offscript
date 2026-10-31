import { Fingerprint, Globe, ScanSearch } from "lucide-react";

const steps = [
  { number: "01", icon: Globe, title: "Define the target and goal",
    description: "Set your application's URL and describe what users should accomplish, rather than prescribing their steps." },
  { number: "02", icon: Fingerprint, title: "Choose your users",
    description: "Select Explorer, Impatient, or Beginner profiles. Each approaches the shared goal with different habits and expectations." },
  { number: "03", icon: ScanSearch, title: "Review and save",
    description: "Check the application, selected users, and execution limits. Save the configuration to your project for later exploration." },
] as const;

export function ExplorationGuide() {
  return <ol aria-label="How to configure an exploration" className="mt-9 grid w-full gap-6 text-left md:grid-cols-3 md:gap-7">
    {steps.map(({ number, icon: Icon, title, description }) => <li key={number}>
      <div className="mb-3 flex items-center gap-3">
        <Icon aria-hidden="true" className="size-4 text-accent" strokeWidth={1.5} />
        <span className="font-mono text-xs text-muted">{number}</span>
      </div>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </li>)}
  </ol>;
}
