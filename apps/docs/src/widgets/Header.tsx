import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router";
import { navItems, npmPackage, repository } from "@/shared/links";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner site-container">
        <Link to="/" className="wordmark" aria-label="OFFSCRIPT home" onClick={() => setOpen(false)}>
          <img src="/brand/logo-perspectives.svg" width="26" height="26" alt="OFFSCRIPT logo" />
          <span>offscript</span>
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav id="site-navigation" aria-label="Main navigation" data-open={open} className="nav-container">
          <div className="nav-links">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => `site-nav-link ${isActive ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-external">
            <a
              className="repo-link"
              href={npmPackage}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              npm
              <ArrowUpRight size={14} className="external-arrow" />
            </a>
            <a
              className="repo-link"
              href={repository}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              GitHub
              <ArrowUpRight size={14} className="external-arrow" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
