import { DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** Current shock sigmas and where they came from. */
export function SecondFoundationCalibration() {
  return (
    <Screen
      sectionId="second-foundation"
      activeTab="calibration"
      lede="The honesty page. Nothing here is decorative: if the engine is not beating the null model, this section says so in the headline position."
    >
      <Panel
        title="Shock sigmas"
        subtitle="The correlated-shock parameters the engine draws from, with the backtest that estimated each one."
        flush
      >
        <DataTable
          caption="Calibrated shock sigmas"
          columns={[
            { key: "shock", header: "Shock", render: () => null },
            { key: "sigma", header: "σ", render: () => null, numeric: true },
            { key: "estimated", header: "Estimated from", render: () => null },
            { key: "at", header: "Calibrated", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="Nothing has been calibrated. Sigmas are estimated against real elections, and no backtest has run."
        />
      </Panel>

      <Panel title="Shy-response factors">
        <EmptyState title="No factors" phase="P4">
          <p>
            The <code>shy-response</code> caveat takes its per-party factors
            from here, provenance-stamped. They are never hand-set — an
            uncalibrated factor has no business adjusting a headline.
          </p>
        </EmptyState>
      </Panel>

      <Note title="Calibration is upstream of every caveat that uses it">
        <p className="m-0">
          A caveat that adjusts an outcome must be able to say where its
          parameters came from. That link starts on this page.
        </p>
      </Note>
    </Screen>
  );
}
