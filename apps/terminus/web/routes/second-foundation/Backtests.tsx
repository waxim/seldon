import { DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** Engine vs the UNS null model, scored on the things that matter. */
export function SecondFoundationBacktests() {
  return (
    <Screen
      sectionId="second-foundation"
      activeTab="backtests"
      lede="A model that cannot beat uniform national swing has not earned the compute it costs. This is where that is settled."
    >
      <Panel title="Scoreboard" flush>
        <DataTable
          caption="Engine versus the UNS null model"
          columns={[
            { key: "election", header: "Election", render: () => null },
            {
              key: "engineSeats",
              header: "Engine seat error",
              render: () => null,
              numeric: true,
            },
            {
              key: "unsSeats",
              header: "UNS seat error",
              render: () => null,
              numeric: true,
            },
            {
              key: "brier",
              header: "Multi-class Brier",
              render: () => null,
              numeric: true,
            },
            {
              key: "coverage",
              header: "Interval coverage",
              render: () => null,
              numeric: true,
            },
            { key: "verdict", header: "Verdict", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No backtest has been run, so the engine has not been shown to beat anything."
        />
      </Panel>

      <Panel title="Coverage">
        <EmptyState title="No intervals to check" phase="P4">
          <p>
            The target is roughly 90/90: about 90% of true values inside the 90%
            interval. An interval that is right 99% of the time is not
            conservative, it is uninformative — both directions are failures.
          </p>
        </EmptyState>
      </Panel>

      <Note tone="radiant" title="The null model is not a formality">
        <p className="m-0">
          Uniform national swing is a genuinely good predictor of UK elections.
          Beating it is the bar, and until a backtest exists this page makes no
          claim either way.
        </p>
      </Note>
    </Screen>
  );
}
