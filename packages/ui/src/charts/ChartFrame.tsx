import { type ReactNode, useId, useState } from "react";
import { cn } from "../lib/cn.js";

export interface ChartFrameProps {
  readonly title: string;
  readonly caption?: ReactNode;
  readonly chart: ReactNode;
  /**
   * The same data as an accessible table. Every chart owes one — it is
   * the accessibility route and the CSV export source
   * (docs/09-terminus.md).
   */
  readonly table?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
}

/** A chart, its caption, and the toggle to read it as a table instead. */
export function ChartFrame({
  title,
  caption,
  chart,
  table,
  actions,
  className,
}: ChartFrameProps) {
  const [asTable, setAsTable] = useState(false);
  const bodyId = useId();

  return (
    <figure className={cn("m-0", className)}>
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tracking-[0.08em] text-ink-faint uppercase">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {actions}
          {table ? (
            <button
              type="button"
              aria-expanded={asTable}
              aria-controls={bodyId}
              onClick={() => setAsTable((value) => !value)}
              className="rounded border border-hairline px-2 py-0.5 text-xs text-ink-faint transition-colors duration-(--motion-fast) hover:border-hairline-strong hover:text-ink-muted"
            >
              {asTable ? "View as chart" : "View as table"}
            </button>
          ) : null}
        </span>
      </figcaption>
      <div id={bodyId}>{asTable && table ? table : chart}</div>
      {caption ? (
        <p className="mt-3 mb-0 text-xs text-ink-faint">{caption}</p>
      ) : null}
    </figure>
  );
}
