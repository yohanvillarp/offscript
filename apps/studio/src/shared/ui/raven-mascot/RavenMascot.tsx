import { useId } from "react";
import "@/shared/ui/raven-mascot/raven-mascot.css";

export type RavenState = "idle" | "observing" | "curious";

export type RavenMascotProps = Readonly<{
  state?: RavenState;
  animated?: boolean;
  className?: string;
  label?: string;
}>;

export function RavenMascot({
  state = "idle",
  animated = true,
  className = "size-32",
  label,
}: RavenMascotProps) {
  const eyeClipId = useId();

  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      className={`raven-mascot ${className}`}
      data-state={state}
      data-animated={animated}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={eyeClipId} clipPathUnits="userSpaceOnUse">
          <circle cx="97" cy="48" r="4" />
        </clipPath>
      </defs>
      <path d="M35 132h95" className="stroke-separator" strokeWidth="1.5" strokeLinecap="round" />
      <g className="raven-mascot__character">
        <path d="M73 116v15m0-1h-7m7 0h7m16-14v15m0-1h-7m7 0h7" className="stroke-foreground" strokeWidth="2.5" strokeLinecap="round" />
        <g className="raven-mascot__body">
          <g className="raven-mascot__tail">
            <path d="m56 99-24 25 23-4 5 10 20-20" className="fill-foreground" />
          </g>
          <path d="M68 62c-16 11-23 28-20 42 3 15 18 21 35 18 17-3 25-16 24-33l-7-24Z" className="fill-foreground" />
          <g className="raven-mascot__wing">
            <path
              d="M75 78c-12 3-18 18-11 32 11 3 26-9 32-27-7-5-14-7-21-5Z"
              className="fill-foreground stroke-muted"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path d="M65 104c8-2 14-7 20-15" className="stroke-muted" strokeWidth="1" strokeLinecap="round" />
          </g>
          <g className="raven-mascot__head">
            <path d="M66 62c-3-7-1-18 6-24 8-8 23-9 33-2 9 6 10 19 4 28l-7 13-18 4-18-19Z" className="fill-foreground" />
            <path d="m106 47 29 13-28 5 2-9-3-9Z" className="fill-foreground" />
            <path d="m111 57 16 3" className="stroke-muted" strokeWidth="1.5" strokeLinecap="round" />
            <path d="m73 39 5-10 5 9" className="fill-foreground" />
            <path d="m86 69 18-5-9 14-12 3Z" className="fill-accent" />
            <g className="raven-mascot__eye">
              <circle cx="97" cy="48" r="4" className="fill-surface" />
              <g clipPath={`url(#${eyeClipId})`}>
                <circle cx="97.5" cy="48" r="1.75" className="raven-mascot__pupil fill-foreground" />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
