import { EmptyState, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

export function ScenariosCompare() {
  return (
    <Screen
      sectionId="scenarios"
      activeTab="compare"
      lede="Two scenarios, or two versions of one, side by side at rule level — so a change of assumption is legible to someone who did not write it."
    >
      <Panel title="Diff">
        <EmptyState
          title="Nothing to compare"
          phase="P3"
          fills={[
            "Rule-level added, removed and changed",
            "Target and headwind deltas",
            "Transfer lattice changes",
            "Mule event onset, magnitude and decay changes",
            "The hash of each side, so the diff is citable",
          ]}
        >
          <p>A diff needs two documents. There are none.</p>
        </EmptyState>
      </Panel>
    </Screen>
  );
}
