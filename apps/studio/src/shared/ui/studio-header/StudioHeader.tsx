import { useId, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import "@/shared/ui/studio-header/studio-header.css";

const documentationUrl = "https://offscript.nikelyh.tech";

export function StudioHeader() {
  const { pathname } = useLocation();
  const simulationsActive = pathname === "/" || pathname.startsWith("/simulations/");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    menuButton.current?.focus();
  }

  return (
    <header className="border-b border-separator bg-surface" onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) { event.preventDefault(); closeMenu(); }
    }}>
      <div className="mx-auto flex min-h-(--layout-header-height) max-w-(--layout-content-max) items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" aria-label="OFFSCRIPT Studio home" className="flex items-center gap-3 rounded-sm">
            <span aria-hidden="true" className="size-7 shrink-0 bg-accent mask-[url(/brand/logo-perspectives.svg)] mask-contain mask-center mask-no-repeat" />
            <span className="text-xl font-semibold tracking-tight">offscript</span>
            <span className="ml-1 hidden rounded-sm border border-separator px-2 py-1 font-mono text-xs text-muted sm:inline">STUDIO</span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center sm:flex">
            <NavLink to="/" end data-active={simulationsActive} className="studio-nav-link px-3 py-3 text-sm">
              Simulations
            </NavLink>
          </nav>
        </div>
        <a href={documentationUrl} target="_blank" rel="noreferrer noopener" className="studio-nav-link hidden items-center gap-2 px-3 py-3 text-sm text-muted sm:inline-flex">
          <BookOpen aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Documentation
          <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
        </a>
        <button
          ref={menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
          className="studio-nav-toggle inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-separator text-foreground sm:hidden"
        >
          {menuOpen ? <X aria-hidden="true" className="size-5" strokeWidth={1.5} /> : <Menu aria-hidden="true" className="size-5" strokeWidth={1.5} />}
        </button>
      </div>
      <nav id={menuId} aria-label="Studio navigation" hidden={!menuOpen} className="border-t border-separator px-5 py-3 sm:hidden">
        <NavLink to="/" end data-active={simulationsActive} onClick={() => setMenuOpen(false)} className="studio-nav-link flex min-h-11 items-center px-3 text-sm">
          Simulations
        </NavLink>
        <a href={documentationUrl} target="_blank" rel="noreferrer noopener" onClick={() => setMenuOpen(false)} className="studio-nav-link flex min-h-11 items-center gap-3 px-3 text-sm text-muted">
          <BookOpen aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Documentation
          <ArrowUpRight aria-hidden="true" className="ml-auto size-4" strokeWidth={1.5} />
        </a>
      </nav>
    </header>
  );
}
