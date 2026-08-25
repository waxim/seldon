import { Button, DataTable, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** Presets and user scenarios, hash-stamped, with their `extends` lineage. */
export function ScenariosList() {
  return (
    <Screen
      sectionId="scenarios"
      activeTab="all"
      actions={
        <Button
          variant="primary"
          disabled
          title="Authoring lands with Vault in P3."
        >
          New scenario
        </Button>
      }
    >
      <Panel title="Scenarios" flush>
        <DataTable
          caption="Scenarios"
          columns={[
            { key: "name", header: "Scenario", render: () => null },
            { key: "kind", header: "Kind", render: () => null },
            { key: "extends", header: "Extends", render: () => null },
            {
              key: "version",
              header: "Version",
              render: () => null,
              numeric: true,
            },
            { key: "hash", header: "Hash", render: () => null },
            { key: "updated", header: "Updated", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No scenarios. Committed presets publish into the Vault on deploy; Vault has not been built."
        />
      </Panel>

      <Note title="Scenarios change behaviour; forks change people">
        <p className="m-0">
          A scenario is an explicit, versioned set of assumptions about how the
          same population behaves. If you want a different population — more
          renters, an older country — that is a{" "}
          <a href="/population/forks" className="text-radiant">
            fork
          </a>
          , not a scenario.
        </p>
      </Note>
    </Screen>
  );
}
