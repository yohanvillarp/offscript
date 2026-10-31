import { Link } from "react-router";
import { Plus } from "lucide-react";
import { SimulationHistory } from "@/pages/home/ui/SimulationHistory";
import { StudioHeader } from "@/shared/ui/studio-header";

export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-(--layer-overlay)"
      >
        Skip to content
      </a>
      <StudioHeader />

      <main id="main-content" className="mx-auto w-full min-w-0 max-w-(--layout-content-max) flex-1 px-5 pt-7 pb-12 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-5 sm:mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Simulations</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Explore applications with autonomous users.
            </p>
          </div>
          <Link
            to="/simulations/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
            New simulation
          </Link>
        </div>

        <SimulationHistory />

      </main>

    </div>
  );
}
