import { Button, DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/**
 * The v2 `recover` command, now a console flow: a hand-downloaded file
 * enters the pipeline at the verify stage, identically to a fetched
 * artefact (docs/05-datasets.md).
 */
export function DatasetsNeedsAHand() {
  return (
    <Screen
      sectionId="datasets"
      activeTab="manual"
      lede="Some sources have no stable URL. They queue here with per-source instructions and a guided upload through the same verify → stage → load pipeline."
    >
      <Panel title="Queue" flush>
        <DataTable
          caption="Sources needing a hand"
          columns={[
            { key: "id", header: "Source", render: () => null },
            { key: "reason", header: "Reason", render: () => null },
            { key: "instructions", header: "Instructions", render: () => null },
            { key: "waiting", header: "Waiting since", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="Nothing is waiting on a human. No source has been attempted."
        />
      </Panel>

      <Panel title="Guided upload">
        <EmptyState
          title="No source is asking for a file"
          phase="P1"
          actions={
            <Button disabled title="There is no source to upload for yet.">
              Upload a file
            </Button>
          }
        >
          <p>
            An uploaded artefact is checksummed and verified exactly as a
            fetched one is. There is no side door into the catalogue.
          </p>
        </EmptyState>
      </Panel>

      <Note>
        <p className="m-0">
          A source lands here by declaring <code>manual: true</code> in its
          committed manifest — not by failing. A fetch that breaks is a failure,
          and failures go to the ingest runs page.
        </p>
      </Note>
    </Screen>
  );
}
