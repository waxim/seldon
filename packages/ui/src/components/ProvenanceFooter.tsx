import type { ReactNode } from "react";

export interface ProvenanceEntry {
  readonly label: string;
  readonly value: ReactNode;
  /** Nothing to point at yet — rendered as a dash, never as a guess. */
  readonly pending?: boolean;
}

export interface ProvenanceFooterProps {
  /** Key/value pairs — the reproducibility tuple, staleness chips, ids. */
  readonly entries: readonly ProvenanceEntry[];
  readonly note?: ReactNode;
}

/**
 * The provenance strip. Every result surface carries one: the honesty
 * rule made a component so it cannot be forgotten (docs/09-terminus.md).
 */
export function ProvenanceFooter({ entries, note }: ProvenanceFooterProps) {
  return (
    <footer className="mt-auto border-t border-hairline pt-4">
      <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {entries.map((entry) => (
          <div key={entry.label} className="flex items-baseline gap-2">
            <dt className="tracking-[0.08em] text-ink-faint uppercase">
              {entry.label}
            </dt>
            <dd className="m-0 font-mono text-ink-muted">
              {entry.pending ? (
                <span className="text-ink-faint">—</span>
              ) : (
                entry.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-3 mb-0 text-xs text-ink-faint">{note}</p> : null}
    </footer>
  );
}
