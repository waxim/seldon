import { Button, DataTable, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

export function QuestionsList() {
  return (
    <Screen
      sectionId="questions"
      activeTab="all"
      actions={
        <Button
          variant="primary"
          disabled
          title="Authoring lands with Vault in P3."
        >
          New question
        </Button>
      }
    >
      <Panel title="Questions" flush>
        <DataTable
          caption="Questions"
          columns={[
            { key: "name", header: "Question", render: () => null },
            { key: "instrument", header: "Instrument", render: () => null },
            { key: "resolver", header: "Resolver", render: () => null },
            {
              key: "version",
              header: "Version",
              render: () => null,
              numeric: true,
            },
            { key: "standing", header: "Standing", render: () => null },
            { key: "updated", header: "Updated", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No questions. Not even the standing one — the flagship question is authored, not hardcoded."
        />
      </Panel>

      <Note title="Elections are the flagship, not the limit">
        <p className="m-0">
          “If a general election were held today” is one question among many.
          Any survey-style ask can be framed, resolved against the replica and
          archived with its outcome — which is why this screen is a list and not
          a single page.
        </p>
      </Note>
    </Screen>
  );
}
