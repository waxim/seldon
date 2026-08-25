import { Chip, DataTable, Note, Panel, StalenessChip } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/**
 * The Encyclopedia's shopfront: every source manifest as a row
 * (docs/05-datasets.md). The manifests are committed under `data/sources`;
 * nothing has been fetched, so every observed column is honestly empty.
 */
export function DatasetsCatalogue() {
  return (
    <Screen
      sectionId="datasets"
      activeTab="catalogue"
      lede="Declared configuration lives in committed manifests; observed state — checksums, fetch history, freshness — lives in the catalogue and is never written back into the manifest."
      meta={<StalenessChip freshness="never" detail="no source fetched" />}
    >
      <Panel
        title="Catalogue"
        subtitle="One row per source manifest, with its tier, licence, cadence and checksum state."
        flush
      >
        <DataTable
          caption="Source catalogue"
          columns={[
            { key: "id", header: "Source", render: () => null },
            { key: "tier", header: "Tier", render: () => null, numeric: true },
            { key: "publisher", header: "Publisher", render: () => null },
            { key: "licence", header: "Licence", render: () => null },
            { key: "cadence", header: "Cadence", render: () => null },
            { key: "fetched", header: "Last fetched", render: () => null },
            { key: "checksum", header: "Checksum", render: () => null },
            { key: "freshness", header: "Freshness", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No source has been ingested. The catalogue is empty until Encyclopedia runs its first workflow."
        />
      </Panel>

      <Panel
        title="Badges you will see here"
        subtitle="Two flags mark the awkward squad, and freshness is surfaced rather than silent."
      >
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          <li className="flex items-start gap-3">
            <Chip tone="radiant">fragile</Chip>
            <span className="text-sm text-ink-muted">
              A source whose fetch is expected to break — scrapes, bot-walled
              hosts. Its failures alert rather than page.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Chip tone="outline">manual</Chip>
            <span className="text-sm text-ink-muted">
              No stable URL at all. It appears in the “needs a hand” queue with
              instructions and a guided upload.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StalenessChip freshness="fresh" />
            <span className="text-sm text-ink-muted">
              Fetched within its declared cadence.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <StalenessChip freshness="stale" />
            <span className="text-sm text-ink-muted">
              Older than its cadence. Anything rendered from it carries this
              chip through to the outcome page.
            </span>
          </li>
        </ul>
      </Panel>

      <Note title="Re-pinning is a decision, not a default">
        <p className="m-0">
          The first fetch pins a source's sha256. Any later mismatch halts the
          workflow — accepting an upstream change is an explicit, typed
          confirmation on the source page, audit-logged with a name attached.
        </p>
      </Note>
    </Screen>
  );
}
