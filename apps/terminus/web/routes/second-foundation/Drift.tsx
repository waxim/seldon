import { DataTable, EmptyState, Note, Panel, StalenessChip } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** Drift alerts and the source-staleness watch — `doctor`, surfaced in place. */
export function SecondFoundationDrift() {
  return (
    <Screen
      sectionId="second-foundation"
      activeTab="drift"
      lede="v2 had a `doctor` command you had to remember to run. Freshness and drift are surfaced in place instead — this page is the watch, not the ritual."
      meta={<StalenessChip freshness="never" detail="no source fetched" />}
    >
      <Panel title="Drift alerts" flush>
        <DataTable
          caption="Drift alerts"
          columns={[
            { key: "signal", header: "Signal", render: () => null },
            {
              key: "observed",
              header: "Observed",
              render: () => null,
              numeric: true,
            },
            {
              key: "expected",
              header: "Expected",
              render: () => null,
              numeric: true,
            },
            { key: "since", header: "Since", render: () => null },
            { key: "severity", header: "Severity", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="Nothing to drift from. Drift is measured against a calibrated baseline, and there is none."
        />
      </Panel>

      <Panel title="Source staleness watch" flush>
        <DataTable
          caption="Source staleness"
          columns={[
            { key: "source", header: "Source", render: () => null },
            { key: "cadence", header: "Cadence", render: () => null },
            { key: "fetched", header: "Last fetched", render: () => null },
            { key: "state", header: "State", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No source has been fetched, so every source is equally unwatched."
        />
      </Panel>

      <Panel title="Freshness in place">
        <EmptyState
          title="Nothing is being rendered from stale data"
          phase="P1"
        >
          <p>
            Anything drawn from data older than its declared cadence carries a
            staleness chip wherever it appears — on the Overview, on an outcome
            page, in a dossier. This page aggregates those chips; it does not
            replace them.
          </p>
        </EmptyState>
      </Panel>

      <Note>
        <p className="m-0">
          The point of surfacing freshness everywhere is that nobody has to
          remember to check. A number that is old says so next to itself.
        </p>
      </Note>
    </Screen>
  );
}
