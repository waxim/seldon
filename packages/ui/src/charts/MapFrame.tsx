import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface MapRung {
  readonly id: string;
  readonly label: string;
  /** MapLibre zoom range, as the ladder in docs/09-terminus.md states it. */
  readonly zoom: string;
  readonly renders: string;
}

/** The UK zoom ladder. Every rung aggregates the same households. */
export const UK_ZOOM_LADDER: readonly MapRung[] = [
  { id: "nation", label: "Nation", zoom: "z4–5", renders: "seat choropleth" },
  { id: "region", label: "Region", zoom: "z6–7", renders: "seats, labelled" },
  { id: "seat", label: "Seat", zoom: "z8–9", renders: "ward boundaries" },
  { id: "ward", label: "Ward", zoom: "z10–12", renders: "LSOA shading" },
  { id: "street", label: "Street", zoom: "z13+", renders: "household dots" },
];

export interface MapFrameProps {
  readonly rungs?: readonly MapRung[];
  readonly activeRung?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly toolbar?: ReactNode;
}

/**
 * Where MapLibre GL mounts once there are PMTiles to point it at (P2).
 * Until then it holds the frame: the zoom ladder, the standing privacy
 * caption, and whatever the screen wants to say about the absence.
 */
export function MapFrame({
  rungs = UK_ZOOM_LADDER,
  activeRung,
  children,
  className,
  toolbar,
}: MapFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-surface-sunken",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <pattern
            id="seldon-graticule"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M8 0H0v8"
              fill="none"
              stroke="var(--hairline)"
              strokeWidth="0.25"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#seldon-graticule)" />
      </svg>

      <div className="relative flex min-h-[320px] flex-col">
        {toolbar ? (
          <div className="border-b border-hairline bg-surface/70 px-3 py-2 backdrop-blur-sm">
            {toolbar}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <ol
            aria-label="Zoom ladder"
            className="m-0 hidden w-40 shrink-0 list-none border-r border-hairline p-3 sm:block"
          >
            {rungs.map((rung) => {
              const active = rung.id === activeRung;
              return (
                <li
                  key={rung.id}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "border-l-2 py-1.5 pl-3",
                    active
                      ? "border-radiant text-ink"
                      : "border-hairline text-ink-faint",
                  )}
                >
                  <span className="block text-xs font-medium">
                    {rung.label}
                  </span>
                  <span className="block font-mono text-[11px] opacity-70">
                    {rung.zoom}
                  </span>
                  <span className="block text-[11px] opacity-70">
                    {rung.renders}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="grid min-w-0 flex-1 place-items-center p-6">
            {children}
          </div>
        </div>

        <p className="m-0 border-t border-hairline px-4 py-2.5 text-xs text-ink-faint">
          Households are synthetic; positions are density-plausible, never real
          addresses.
        </p>
      </div>
    </div>
  );
}
