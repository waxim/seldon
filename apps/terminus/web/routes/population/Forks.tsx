import { DataTable, EmptyState, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/**
 * Forks change *people*; scenarios change *behaviour*
 * (docs/06-scenarios.md). The fork builder composes ordered skew ops over
 * a parent epoch.
 */
const SKEW_OPS = [
  {
    id: "add-cohort",
    name: "Add cohort",
    effect: "Insert synthetic persons matching a predicate.",
  },
  {
    id: "remove-cohort",
    name: "Remove cohort",
    effect: "Drop persons matching a predicate.",
  },
  {
    id: "age-shift",
    name: "Age shift",
    effect: "Move a population's age distribution by a given number of years.",
  },
  {
    id: "scale-band",
    name: "Scale band",
    effect: "Grow or shrink a banded attribute — income, house price, EPC.",
  },
  {
    id: "tenure-shift",
    name: "Tenure shift",
    effect: "Move households between tenure categories.",
  },
  {
    id: "registration-rate",
    name: "Registration rate",
    effect: "Change modelled electoral-roll membership.",
  },
];

export function PopulationForks() {
  return (
    <Screen
      sectionId="population"
      activeTab="forks"
      lede="A fork is a canon epoch plus an ordered list of skew operations — a different country, not a different mood. Each op carries a live estimated-impact count."
    >
      <Panel title="Forks" flush>
        <DataTable
          caption="Forks"
          columns={[
            { key: "id", header: "Fork", render: () => null },
            { key: "parent", header: "Parent epoch", render: () => null },
            { key: "ops", header: "Ops", render: () => null, numeric: true },
            {
              key: "impact",
              header: "Δ persons",
              render: () => null,
              numeric: true,
            },
            { key: "created", header: "Created", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No forks. A fork needs a canon epoch to fork from."
        />
      </Panel>

      <Panel
        title="The skew builder"
        subtitle="Each op is a card with a predicate, a magnitude and a live estimated-impact count; lineage renders as a small graph from the parent epoch."
      >
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {SKEW_OPS.map((op) => (
            <li
              key={op.id}
              className="rounded-md border border-dashed border-hairline bg-ink/[0.025] p-4"
            >
              <p className="m-0 text-sm font-medium text-ink">{op.name}</p>
              <p className="mt-1 mb-3 text-xs text-ink-muted">{op.effect}</p>
              <p className="m-0 font-mono text-xs text-ink-faint">
                — estimated impact unavailable —
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Lineage">
        <EmptyState title="Nothing to draw a lineage from" phase="P5">
          <p>
            Forks and their compare view are the phase that also brings Mule
            events and the second world — the point at which the world
            abstraction has to prove itself.
          </p>
        </EmptyState>
      </Panel>
    </Screen>
  );
}
