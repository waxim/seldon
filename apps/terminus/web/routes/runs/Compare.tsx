import { DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

export function RunsCompare() {
  return (
    <Screen
      sectionId="runs"
      activeTab="compare"
      lede="Two runs side by side — and, crucially, a tuple diff that states why they differ."
    >
      <Panel title="Seats changing hands" flush>
        <DataTable
          caption="Seats changing hands between two runs"
          columns={[
            { key: "seat", header: "Seat", render: () => null },
            { key: "a", header: "Run A", render: () => null },
            { key: "b", header: "Run B", render: () => null },
            {
              key: "delta",
              header: "Δ share",
              render: () => null,
              numeric: true,
            },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="Comparison needs two runs. There are none."
        />
      </Panel>

      <Panel title="Why they differ">
        <EmptyState title="No tuple to diff" phase="P3">
          <p>
            Scenario hash, epoch, question version, seed, engine version — the
            comparison names which element moved, so a difference is never
            mysterious.
          </p>
        </EmptyState>
      </Panel>

      <Note>
        <p className="m-0">
          Two runs of the same tuple must produce the same answer. If they do
          not, that is a determinism bug, and the compare view is where it shows
          up first.
        </p>
      </Note>
    </Screen>
  );
}
