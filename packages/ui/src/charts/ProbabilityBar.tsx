import { cn } from "../lib/cn.js";

export interface ProbabilitySegment {
  readonly label: string;
  readonly share: number;
  readonly colour: string;
}

export interface ProbabilityBarProps {
  readonly segments?: readonly ProbabilitySegment[];
  readonly label: string;
  /** Say what an empty track means rather than showing a zeroed bar. */
  readonly emptyNote?: string;
  readonly className?: string;
}

/**
 * A distribution, never a single label. Leanings, vote-intent splits and
 * call probabilities all render through this so a household's answer is
 * always shown as a spread (docs/09-terminus.md).
 */
export function ProbabilityBar({
  segments,
  label,
  emptyNote,
  className,
}: ProbabilityBarProps) {
  const total = segments?.reduce((sum, segment) => sum + segment.share, 0) ?? 0;

  if (!segments || segments.length === 0 || total <= 0) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div
          className="h-2.5 w-full rounded-full border border-dashed border-hairline-strong"
          role="img"
          aria-label={`${label}: no distribution yet`}
        />
        {emptyNote ? (
          <p className="m-0 text-xs text-ink-faint">{emptyNote}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={`${label}: ${segments
          .map((s) => `${s.label} ${(s.share * 100).toFixed(1)}%`)
          .join(", ")}`}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{
              width: `${(segment.share / total) * 100}%`,
              backgroundColor: segment.colour,
            }}
          />
        ))}
      </div>
      <ul className="m-0 flex flex-wrap gap-x-3 gap-y-1 p-0 text-xs">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-[2px]"
              style={{ backgroundColor: segment.colour }}
            />
            <span className="text-ink-muted">{segment.label}</span>
            <span className="font-mono text-ink">
              {(segment.share * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
