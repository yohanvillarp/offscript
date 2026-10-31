import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import {
  createBrowserRouter,
  Link,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from "react-router";
import { Header } from "@/widgets/Header";
import { Hero } from "@/widgets/Hero";
import { HowItWorks } from "@/widgets/HowItWorks";
import { GetStarted } from "@/widgets/GetStarted";
import { Reference } from "@/widgets/Reference";
import { npmPackage, repository, sourceDoc } from "@/shared/links";

function RootLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div id="top" className="min-h-screen w-full bg-canvas text-foreground flex flex-col justify-between">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="site-footer site-container">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <img src="/brand/logo-perspectives.svg" width="22" height="22" alt="" className="shrink-0" />
            <strong>offscript</strong>
            <span className="rounded-sm border border-separator px-1.5 py-0.5 font-mono text-[0.7rem] text-accent">
              v1.7.0
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
      <ScrollRestoration />
    </div>
  );
}

function HomePage() {
  return (
    <>
      <Hero />
      <div className="site-container pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/how-it-works"
            className="group rounded-lg border border-separator bg-surface p-6 transition hover:border-accent/50 hover:bg-surface-subtle"
          >
            <span className="font-mono text-xs text-accent">01 / Concept</span>
            <h3 className="mt-2 text-lg font-medium text-foreground flex items-center justify-between">
              How it works
              <ArrowRight
                size={16}
                className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1"
              />
            </h3>
            <p className="mt-2 text-sm text-muted">
              Learn how Mozaik multi-agent coordination and Playwright browser execution work together.
            </p>
          </Link>

          <Link
            to="/get-started"
            className="group rounded-lg border border-separator bg-surface p-6 transition hover:border-accent/50 hover:bg-surface-subtle"
          >
            <span className="font-mono text-xs text-accent">02 / Setup</span>
            <h3 className="mt-2 text-lg font-medium text-foreground flex items-center justify-between">
              Get started
              <ArrowRight
                size={16}
                className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1"
              />
            </h3>
            <p className="mt-2 text-sm text-muted">
              Install the CLI via npm, launch Studio, and run your first autonomous simulation.
            </p>
          </Link>

          <Link
            to="/reference"
            className="group rounded-lg border border-separator bg-surface p-6 transition hover:border-accent/50 hover:bg-surface-subtle"
          >
            <span className="font-mono text-xs text-accent">03 / Details</span>
            <h3 className="mt-2 text-lg font-medium text-foreground flex items-center justify-between">
              Reference
              <ArrowRight
                size={16}
                className="text-muted group-hover:text-accent transition-transform group-hover:translate-x-1"
              />
            </h3>
            <p className="mt-2 text-sm text-muted">
              Explore CLI commands, safety boundaries, and the 6 artificial user personas.
            </p>
          </Link>
        </div>
      </div>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/how-it-works", element: <HowItWorks /> },
      { path: "/get-started", element: <GetStarted /> },
      { path: "/reference", element: <Reference /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
