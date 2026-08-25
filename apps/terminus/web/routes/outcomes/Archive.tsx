import { DataTable, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** The Vault: every prediction ever made, kept whole. */
export function OutcomesArchive() {
  return (
    <Screen sectionId="outcomes">
      <Panel title="The archive" flush>
        <DataTable
          caption="Outcomes"
          columns={[
            { key: "id", header: "Outcome", render: () => null },
            { key: "question", header: "Question", render: () => null },
            { key: "scenario", header: "Scenario", render: () => null },
            { key: "epoch", header: "Epoch", render: () => null },
            { key: "headline", header: "Headline", render: () => null },
            { key: "produced", header: "Produced", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="The Vault is empty. Nothing has been predicted, so nothing has been archived."
        />
      </Panel>

      <Note title="Nothing is ever quietly revised">
        <p className="m-0">
          An outcome is written once and kept. A better model does not rewrite
          an old prediction — it produces a new one, and the record of what was
          believed at the time survives to be scored against reality on the
          Second Foundation page.
        </p>
      </Note>
    </Screen>
  );
}
