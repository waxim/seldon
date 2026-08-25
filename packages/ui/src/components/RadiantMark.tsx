import { cn } from "../lib/cn.js";

export interface RadiantMarkProps {
  readonly size?: number;
  readonly className?: string;
  /** Give it a title when it stands alone as the product mark. */
  readonly label?: string;
}

/**
 * The Prime Radiant, reduced to a mark: a projected sphere of equations
 * with the light coming from one side. Used as the product mark in the
 * top bar and as the glyph on empty states.
 */
export function RadiantMark({ size = 20, className, label }: RadiantMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      role={label ? "img" : "presentation"}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
    >
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="var(--radiant)"
        strokeWidth="1.1"
        opacity="0.85"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4"
        ry="9.25"
        stroke="var(--radiant)"
        strokeWidth="0.9"
        opacity="0.5"
      />
      <path
        d="M2.75 12h18.5"
        stroke="var(--radiant)"
        strokeWidth="0.9"
        opacity="0.5"
      />
      <path
        d="M4.6 6.6c4.4 2.1 10.4 2.1 14.8 0M4.6 17.4c4.4-2.1 10.4-2.1 14.8 0"
        stroke="var(--radiant)"
        strokeWidth="0.8"
        opacity="0.35"
      />
      <circle cx="12" cy="12" r="2" fill="var(--radiant)" />
    </svg>
  );
}
