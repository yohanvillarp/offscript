import { Header } from "@/widgets/Header";
import { Hero } from "@/widgets/Hero";
import { HowItWorks } from "@/widgets/HowItWorks";
import { GetStarted } from "@/widgets/GetStarted";
import { Reference } from "@/widgets/Reference";
import { ShareBar } from "@/shared/ShareBar";
import { npmPackage, repository, sourceDoc } from "@/shared/links";

export function App() {
  return (
    <div id="top" className="min-h-screen w-full bg-canvas text-foreground">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <HowItWorks />
        <GetStarted />
        <Reference />
        <div className="site-container my-10">
          <ShareBar />
        </div>
      </main>
      <footer className="site-footer site-container">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-perspectives.svg" width="22" height="22" alt="" className="shrink-0" />
            <strong>offscript</strong>
            <span className="rounded-sm border border-separator px-1.5 py-0.5 font-mono text-[0.7rem] text-accent">
              v1.0.0
            </span>
          </div>
          <span>Different users. Shared discoveries.</span>
        </div>
        <nav aria-label="Footer">
          <a href={npmPackage} target="_blank" rel="noreferrer">
            npm
          </a>
          <a href={sourceDoc("ARCHITECTURE.md")} target="_blank" rel="noreferrer">
            Architecture
          </a>
          <a href={`${repository}/issues`} target="_blank" rel="noreferrer">
            Feedback
          </a>
          <a href={`${repository}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
            Apache 2.0
          </a>
          <a href="./licenses/space-grotesk.txt">Space Grotesk license</a>
          <a href="./licenses/jetbrains-mono.txt">JetBrains Mono license</a>
        </nav>
      </footer>
    </div>
  );
}
