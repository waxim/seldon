import { Button, DefinitionList, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/** A single source: manifest, fetch history, guards, checksum panel. */
export function DatasetsSource({ sourceId }: { readonly sourceId: string }) {
  return (
    <Screen
      sectionId="datasets"
      title={sourceId}
      lede="The manifest as declared, the fetch history as observed, and the checksum panel where an upstream change is accepted by name."
    >
      <Note tone="radiant" title="Not in the catalogue">
        <p className="m-0">
          <code>{sourceId}</code> has no catalogue record. Manifests are
          committed under <code>data/sources/</code>, but a source only appears
          here once Encyclopedia has attempted it.
        </p>
      </Note>

      <Panel title="Manifest">
        <DefinitionList
          columns={3}
          items={[
            { term: "tier", value: "—", pending: true },
            { term: "publisher", value: "—", pending: true },
            { term: "licence", value: "—", pending: true },
            { term: "cadence", value: "—", pending: true },
            { term: "fetch url", value: "—", pending: true },
            { term: "expect guards", value: "—", pending: true },
            { term: "stage recipe", value: "—", pending: true },
            { term: "load checks", value: "—", pending: true },
            { term: "derives", value: "—", pending: true },
          ]}
        />
      </Panel>

      <Panel
        title="Checksum"
        subtitle="The first fetch pins a hash; a later mismatch halts the workflow."
        actions={
          <Button
            variant="danger"
            disabled
            title="Nothing has been pinned, so there is nothing to re-pin."
          >
            Re-pin
          </Button>
        }
      >
        <EmptyState title="Nothing pinned" phase="P1">
          <p>
            Re-pinning is destructive and audited: it takes a typed confirmation
            and records who accepted the change.
          </p>
        </EmptyState>
      </Panel>

      <Panel title="Fetch history">
        <EmptyState title="Never fetched" phase="P1">
          <p>
            Each attempt records the bytes retrieved, the sha256, the guard
            results and the timestamp.
          </p>
        </EmptyState>
      </Panel>
    </Screen>
  );
}
