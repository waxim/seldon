import { DefinitionList, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

export function QuestionDetail({
  questionId,
}: {
  readonly questionId: string;
}) {
  return (
    <Screen
      sectionId="questions"
      title={questionId}
      lede="A question is a versioned document. Every outcome names the exact version that produced it."
    >
      <Note tone="radiant" title="No such question">
        <p className="m-0">
          <code>{questionId}</code> cannot resolve: the Vault holds no
          questions.
        </p>
      </Note>

      <Panel title="Anatomy">
        <DefinitionList
          columns={2}
          items={[
            { term: "instrument", value: "—", pending: true },
            { term: "frame", value: "—", pending: true },
            { term: "resolver", value: "—", pending: true },
            { term: "outcome functions", value: "—", pending: true },
            { term: "caveats", value: "—", pending: true },
            { term: "standing cadence", value: "—", pending: true },
          ]}
        />
      </Panel>

      <Panel title="Version history">
        <EmptyState title="No versions" phase="P3">
          <p>
            Each saved version is diffed against its predecessor, and “run this”
            pre-fills the launch drawer with the version you are looking at.
          </p>
        </EmptyState>
      </Panel>
    </Screen>
  );
}
