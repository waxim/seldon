import { DataTable, EmptyState, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

const STAGES = [
  {
    id: "fetch",
    name: "Fetch",
    detail: "hardened HTTP, expect guards, raw artefact to R2",
  },
  { id: "verify", name: "Verify", detail: "sha256 against the pinned hash" },
  { id: "stage", name: "Stage", detail: "typed TypeScript recipe → Parquet" },
  {
    id: "load",
    name: "Load",
    detail: "Iceberg registration, integrity checks",
  },
  {
    id: "derive",
    name: "Derive",
    detail: "rebuild derived tables, stamp inputs",
  },
];

/** Live and historical Workflow executions, stage by stage, failing loudly. */
export function DatasetsIngestRuns() {
  return (
    <Screen
      sectionId="datasets"
      activeTab="ingest"
      lede="Each source ingests through one durable Workflow: five stages, retried per step, one instance per source and attempt."
    >
      <Panel
        title="The pipeline"
        subtitle="Every ingest run walks these five stages in order."
      >
        <ol className="m-0 grid list-none gap-2 p-0 lg:grid-cols-5">
          {STAGES.map((stage, index) => (
            <li
              key={stage.id}
              className="relative rounded-md border border-dashed border-hairline bg-ink/[0.025] p-3"
            >
              <span className="font-mono text-xs text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="m-0 text-sm font-medium text-ink">{stage.name}</p>
              <p className="mt-1 mb-0 text-xs text-ink-muted">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Runs" flush>
        <DataTable
          caption="Ingest runs"
          columns={[
            { key: "id", header: "Run", render: () => null },
            { key: "source", header: "Source", render: () => null },
            { key: "stage", header: "Stage", render: () => null },
            { key: "started", header: "Started", render: () => null },
            {
              key: "duration",
              header: "Duration",
              render: () => null,
              numeric: true,
            },
            { key: "outcome", header: "Outcome", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="No ingest run has been started."
        />
      </Panel>

      <Panel title="Failure detail">
        <EmptyState
          title="Nothing has failed, because nothing has run"
          phase="P1"
        >
          <p>
            When a stage fails this panel carries the whole story: the guard
            that tripped, the bytes that arrived, the checksum that did not
            match, and the check that rejected the load.
          </p>
        </EmptyState>
      </Panel>
    </Screen>
  );
}
