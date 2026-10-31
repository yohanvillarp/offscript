import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { npmPackage, repository, sections } from "@/shared/links";

export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner site-container">
    <a className="wordmark" href="#top" aria-label="OFFSCRIPT home"><img src="/brand/logo-perspectives.svg" width="26" height="26" alt="OFFSCRIPT logo" />offscript</a>
    <button className="menu-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav id="site-navigation" aria-label="Main navigation" data-open={open}>
      {sections.map(section => <a key={section.id} href={`#${section.id}`} onClick={() => setOpen(false)}>{section.label}</a>)}
      <a className="repo-link" href={npmPackage} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>npm<ArrowUpRight size={15} /></a>
      <a className="repo-link" href={repository} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>GitHub<ArrowUpRight size={15} /></a>
    </nav>
  </div></header>;
}
