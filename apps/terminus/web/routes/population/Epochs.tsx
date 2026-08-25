import { DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/**
 * The canon advances in immutable epochs as new data lands
 * (docs/04-population.md). This tab lists them; nothing has been
 * synthesised yet.
 */
export function PopulationEpochs() {
  return (
    <Screen
      sectionId="population"
      activeTab="epochs"
      lede="The canon population advances in immutable epochs. An epoch names the data version it was built from, the synthesis config that built it, and the fidelity report it had to pass."
    >
      <Panel title="Canon epochs" flush>
        <DataTable
          caption="Canon epochs"
          columns={[
            { key: "id", header: "Epoch", render: () => null },
            { key: "version", header: "Data version", render: () => null },
            { key: "config", header: "Synthesis config", render: () => null },
            {
              key: "households",
              header: "Households",
              render: () => null,
              numeric: true,
            },
            { key: "fidelity", header: "Fidelity", render: () => null },
            { key: "created", header: "Created", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No epoch has been synthesised. The canon is empty."
        />
      </Panel>

      <Panel title="Synthesis">
        <EmptyState
          title="Nothing to synthesise from"
          phase="P2"
          fills={[
            "Iterative proportional fitting over demographic cells",
            "Household composition and person attributes",
            "Density-plausible placement inside each output area",
            "The fidelity report an epoch must pass to become canon",
            "Artefacts in R2, one per shard, checksummed",
          ]}
        >
          <p>
            Synthesis reads derived tables from the Encyclopedia. Those tables
            arrive first, in P1 — until then there is nothing to fit against.
          </p>
        </EmptyState>
      </Panel>

      <Note title="Why an epoch is immutable">
        <p className="m-0">
          Every outcome ever produced names the epoch it ran against. If an
          epoch could change underneath it, the reproducibility tuple would be a
          lie — so new data makes a new epoch and the old one stays exactly as
          it was.
        </p>
      </Note>
    </Screen>
  );
}
