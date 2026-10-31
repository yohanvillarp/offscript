import type { ReactNode } from "react";

type SectionProps = Readonly<{
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}>;

export function Section({ id, labelledBy, className = "", children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`site-section site-container ${className}`}>
      {children}
    </section>
  );
}
