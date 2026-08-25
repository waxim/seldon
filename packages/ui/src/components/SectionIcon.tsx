import type { ReactNode } from "react";

/**
 * One glyph per section of the information architecture. Hand-drawn at
 * 16px on a 16px grid: no icon dependency, and each one says something
 * about its section rather than being decoration.
 */
const PATHS: Record<string, ReactNode> = {
  // Overview — the hemicycle, the signature visual, in miniature.
  overview: (
    <>
      <path d="M2 12a6 6 0 0 1 12 0" />
      <path d="M4.6 12a3.4 3.4 0 0 1 6.8 0" />
      <path d="M8 12v0" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  // Population — households on a street.
  population: (
    <>
      <path d="M2 13.5h12" />
      <path d="M3 11V8l2.2-1.8L7.4 8v3" />
      <path d="M9 11V6.5l2.2-1.8L13.4 6.5V11" />
    </>
  ),
  // Datasets — stacked, versioned tables.
  datasets: (
    <>
      <ellipse cx="8" cy="4" rx="5.2" ry="2" />
      <path d="M2.8 4v4c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V4" />
      <path d="M2.8 8v4c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V8" />
    </>
  ),
  // Scenarios — assumptions, dialled in.
  scenarios: (
    <>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
      <circle cx="5.5" cy="4.5" r="1.6" />
      <circle cx="10.5" cy="8" r="1.6" />
      <circle cx="6.5" cy="11.5" r="1.6" />
    </>
  ),
  // Questions — an instrument branching into its options.
  questions: (
    <>
      <circle cx="4" cy="8" r="1.7" />
      <circle cx="12" cy="4.2" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="12" cy="11.8" r="1.5" />
      <path d="M5.7 8h1.8M7.5 8V4.2h3M7.5 8h3M7.5 8v3.8h3" />
    </>
  ),
  // Runs — iterations accumulating.
  runs: (
    <>
      <path d="M1.5 11.5 4 7l2.5 2.5L9.5 3l2 5.5L14.5 6" />
      <path d="M1.5 14h13" opacity="0.5" />
    </>
  ),
  // Outcomes — the Vault.
  outcomes: (
    <>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="8" cy="8" r="2.6" />
      <path d="M8 5.4V3.6M8 12.4v-1.8M5.4 8H3.6M12.4 8h-1.8" />
    </>
  ),
  // Second Foundation — calibration against the truth.
  "second-foundation": (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" />
    </>
  ),
};

export interface SectionIconProps {
  readonly id: string;
  readonly size?: number;
}

export function SectionIcon({ id, size = 16 }: SectionIconProps) {
  const path = PATHS[id];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {path}
    </svg>
  );
}
