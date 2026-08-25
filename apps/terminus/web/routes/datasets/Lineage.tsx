import { EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

const DERIVED = [
  "constituencies",
  "baseline_shares",
  "seat_facts",
  "constituency_marginals",
  "polling_now",
];

/** Derived table → sources → versions, as an interactive DAG. */
export function DatasetsLineage() {
  return (
    <Screen
      sectionId="datasets"
      activeTab="lineage"
      lede="Every provenance link anywhere in the console enters here: a derived table, the sources behind it, and the exact versions each one contributed."
    >
      <Panel title="Lineage graph" flush>
        <div className="grid min-h-[280px] place-items-center p-6">
          <EmptyState title="No versions to draw" phase="P1" variant="page">
            <p>
              A lineage graph needs at least one loaded data version. None has
              been produced.
            </p>
          </EmptyState>
        </div>
      </Panel>

      <Panel
        title="Derived tables"
        subtitle="These are the tables the rest of Seldon actually reads. No service reads a raw source."
      >
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {DERIVED.map((table) => (
            <li
              key={table}
              className="rounded-md border border-dashed border-hairline px-3 py-1.5 font-mono text-sm text-ink-muted"
            >
              {table}
            </li>
          ))}
        </ul>
      </Panel>

      <Note>
        <p className="m-0">
          Derivations are versioned and stamped with their input versions, so a
          number on an outcome page can be walked back to the published table it
          came from.
        </p>
      </Note>
    </Screen>
  );
}
