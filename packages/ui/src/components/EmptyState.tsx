import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { type Phase, PhaseChip } from "./PhaseChip.js";
import { RadiantMark } from "./RadiantMark.js";
import { Starfield } from "./Starfield.js";

export interface EmptyStateProps {
  readonly title: string;
  /** Say plainly why it is empty. Never apologise, never invent a number. */
  readonly children: ReactNode;
  /** The phase that fills this surface. */
  readonly phase?: Phase;
  /** What will live here once it is built — the promise, itemised. */
  readonly fills?: readonly string[];
  readonly actions?: ReactNode;
  /** `panel` sits inside a Panel body; `page` stands alone as the screen. */
  readonly variant?: "panel" | "page";
  readonly className?: string;
}

/**
 * The most-used component in the console right now, and the one that has
 * to be honest: an unbuilt screen says what it will hold and which phase
 * holds it, rather than showing invented numbers (docs/p0-acceptance.md).
 */
export function EmptyState({
  title,
  children,
  phase,
  fills,
  actions,
  variant = "panel",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-lg",
        variant === "page"
          ? "border border-dashed border-hairline bg-surface px-6 py-12"
          : "px-1 py-2",
        className,
      )}
    >
      {variant === "page" ? <Starfield seed={4_042} /> : null}
      <div className="relative mx-auto max-w-[64ch] text-center">
        <RadiantMark
          size={variant === "page" ? 40 : 28}
          className="mx-auto opacity-70"
        />
        <h3 className="mt-4 mb-0 text-lg font-semibold text-ink">{title}</h3>
        <div className="mt-2 text-sm text-ink-muted [&_p]:my-2">{children}</div>

        {phase ? (
          <div className="mt-4 flex justify-center">
            <PhaseChip phase={phase} />
          </div>
        ) : null}

        {fills && fills.length > 0 ? (
          <div className="mt-6 text-left">
            <p className="m-0 text-xs tracking-[0.08em] text-ink-faint uppercase">
              What will live here
            </p>
            <ul className="mt-2 mb-0 grid gap-1.5 pl-0 sm:grid-cols-2">
              {fills.map((entry) => (
                <li
                  key={entry}
                  className="flex gap-2 text-sm text-ink-muted list-none"
                >
                  <span aria-hidden="true" className="text-radiant/60">
                    ·
                  </span>
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {actions ? (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
