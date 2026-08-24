export interface ProvenanceFooterProps {
  /** Key/value pairs — the reproducibility tuple, staleness chips, ids. */
  readonly entries: readonly { label: string; value: string }[];
}

/**
 * The provenance strip. Every result surface carries one: the honesty
 * rule made a component so it cannot be forgotten.
 */
export function ProvenanceFooter({ entries }: ProvenanceFooterProps) {
  return (
    <footer className="seldon-provenance">
      {entries.map((entry) => (
        <span key={entry.label}>
          <span className="seldon-provenance-label">{entry.label}</span>
          <code>{entry.value}</code>
        </span>
      ))}
    </footer>
  );
}
