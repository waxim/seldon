import { fieldNames, fieldRegistryFor } from "@seldon/dsl";
import {
  Chip,
  DataTable,
  DslFilterBar,
  EmptyState,
  Note,
  Panel,
} from "@seldon/ui";
import { useState } from "react";
import { Screen } from "../../components/Screen.js";

type View = "count" | "breakdown" | "sample";

const VIEWS: readonly { id: View; label: string; blurb: string }[] = [
  {
    id: "count",
    label: "Count",
    blurb:
      "Matched persons and households, nationally and per rung — with the map dimming non-matching areas so the filter is visible geographically.",
  },
  {
    id: "breakdown",
    label: "Breakdown",
    blurb: "Cross-tabulate the matches by any registry field or layer.",
  },
  {
    id: "sample",
    label: "Sample",
    blurb:
      "A seeded, reproducible sample of matching households, each opening its dossier.",
  },
];

/**
 * Explore mode: one DSL, every door. A predicate built here can be saved
 * onward as a question frame, a scenario rule `when`, or a bookmark
 * (docs/09-terminus.md).
 */
export function PopulationExplore({
  initialPredicate = "",
}: {
  readonly initialPredicate?: string;
}) {
  const [predicate, setPredicate] = useState(initialPredicate);
  const [view, setView] = useState<View>("count");
  const registry = fieldRegistryFor("uk");
  const fields = [...registry.fields.values()];
  const active = VIEWS.find((entry) => entry.id === view) ?? VIEWS[0];

  return (
    <Screen
      sectionId="population"
      activeTab="explore"
      lede="Type a predicate; the field registry types it for you and a misspelt field is a compile error, never a silent empty match."
      meta={
        <Chip tone="outline">
          {fieldNames(registry).length} fields · registry v{registry.version}
        </Chip>
      }
    >
      <Panel title="Filter">
        <DslFilterBar
          worldId="uk"
          value={predicate}
          onChange={setPredicate}
          pendingNote="Autocomplete and lint run against the committed field registry. The live match count arrives with the replica."
        />
      </Panel>

      <Panel
        title="Results"
        actions={
          <div
            role="tablist"
            aria-label="Result view"
            className="flex gap-1 rounded-md border border-hairline p-0.5"
          >
            {VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={entry.id === view}
                onClick={() => setView(entry.id)}
                className={
                  entry.id === view
                    ? "rounded bg-ink/[0.07] px-2.5 py-1 text-xs text-ink"
                    : "rounded px-2.5 py-1 text-xs text-ink-faint hover:text-ink"
                }
              >
                {entry.label}
              </button>
            ))}
          </div>
        }
      >
        <EmptyState title={`No population to ${view}`} phase="P2">
          <p>{active?.blurb}</p>
        </EmptyState>
      </Panel>

      <Panel
        title="The field registry"
        subtitle="What you can filter on today. Committed as code, versioned with the epoch schema it describes."
        flush
      >
        <DataTable
          caption="Predicate fields"
          columns={[
            {
              key: "name",
              header: "Field",
              render: (field) => <code className="text-ink">{field.name}</code>,
            },
            {
              key: "type",
              header: "Type",
              render: (field) => field.type,
            },
            {
              key: "axis",
              header: "Axis",
              render: (field) => field.axis,
            },
            {
              key: "layer",
              header: "Layer",
              render: (field) => <Chip tone="outline">{field.layer}</Chip>,
            },
            {
              key: "description",
              header: "Description",
              render: (field) => (
                <span className="text-ink-muted">{field.description}</span>
              ),
            },
          ]}
          rows={fields}
          rowKey={(field) => field.name}
          empty="No registry for this world."
        />
      </Panel>

      <Note tone="radiant" title="What is real here today">
        <p className="m-0">
          The typed registry and its field lint are built and tested. The
          grammar, parser and evaluator are not — so the bar checks identifiers,
          not expressions: it will not yet catch a type error like{" "}
          <code>tenure &gt; 5</code>.
        </p>
      </Note>
    </Screen>
  );
}
