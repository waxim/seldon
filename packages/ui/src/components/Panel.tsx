import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface PanelProps {
  readonly title?: string;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Drop the body padding when the child owns its own edges (tables, maps). */
  readonly flush?: boolean;
  readonly className?: string;
  readonly bodyClassName?: string;
}

/** A titled surface. The unit every screen is assembled from. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  flush = false,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-surface",
        className,
      )}
    >
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 className="m-0 text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-1 mb-0 max-w-[72ch] text-sm text-ink-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={cn(flush ? "" : "p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
