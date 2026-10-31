import { Header } from "@/widgets/Header";
import { Hero } from "@/widgets/Hero";
import { HowItWorks } from "@/widgets/HowItWorks";
import { GetStarted } from "@/widgets/GetStarted";
import { Reference } from "@/widgets/Reference";
import { repository, sourceDoc } from "@/shared/links";

export function App() {
  return <div id="top" className="min-h-screen w-full bg-canvas text-foreground">
    <a className="skip-link" href="#main">Skip to content</a>
    <Header />
    <main id="main">
      <Hero />
      <HowItWorks />
      <GetStarted />
      <Reference />
    </main>
    <footer className="site-footer site-container"><div><strong>offscript</strong><span>Different users. Shared discoveries.</span></div><nav aria-label="Footer"><a href={sourceDoc("ARCHITECTURE.md")} target="_blank" rel="noreferrer">Architecture</a><a href={`${repository}/issues`} target="_blank" rel="noreferrer">Feedback</a><a href={`${repository}/blob/main/LICENSE`} target="_blank" rel="noreferrer">Apache 2.0</a><a href="./licenses/space-grotesk.txt">Space Grotesk license</a><a href="./licenses/jetbrains-mono.txt">JetBrains Mono license</a></nav></footer>
  </div>;
}
