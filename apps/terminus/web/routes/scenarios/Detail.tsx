import { EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

const PARTS = [
  {
    id: "targets",
    name: "Targets",
    detail:
      "National and regional shares as sliders-with-numerals — the number is always typeable, never only draggable.",
  },
  {
    id: "headwinds",
    name: "Headwinds",
    detail: "Standing pressures applied before rules.",
  },
  {
    id: "rules",
    name: "Rules",
    detail:
      "A card per rule: a `when` predicate in the same DSL as explore, plus its effect — lean in log-odds and an additive turnout delta — wearing a live matched-population count.",
  },
  {
    id: "transfers",
    name: "Tactical transfers",
    detail:
      "A fraction of one party's resolved support moved to another, optionally gated on marginality.",
  },
  {
    id: "mule",
    name: "Mule events",
    detail:
      "Named exogenous shocks with onset, magnitude and decay — each card previewing its residue as a sparkline.",
  },
];

/** The scenario editor, made legible to a non-author. */
export function ScenarioDetail({
  scenarioId,
}: {
  readonly scenarioId: string;
}) {
  return (
    <Screen
      sectionId="scenarios"
      title={scenarioId}
      lede="A scenario is a versioned document. The editor shows the flattened result of its inheritance chain, and lint blocks save-as-version."
    >
      <Note tone="radiant" title="No such scenario">
        <p className="m-0">
          <code>{scenarioId}</code> cannot resolve: the Vault holds no
          scenarios. The editor's sections are listed below in the order they
          apply.
        </p>
      </Note>

      {PARTS.map((part) => (
        <Panel key={part.id} title={part.name} subtitle={part.detail}>
          <EmptyState title={`No ${part.name.toLowerCase()}`} phase="P3">
            <p>
              This section fills in when scenario authoring lands with the
              Vault.
            </p>
          </EmptyState>
        </Panel>
      ))}
    </Screen>
  );
}
