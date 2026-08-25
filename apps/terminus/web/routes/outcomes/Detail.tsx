import { UK_SEAT_TOTAL } from "@seldon/geo";
import { partiesFor } from "@seldon/parties";
import {
  Button,
  ChartFrame,
  DataTable,
  EmptyState,
  Hemicycle,
  MapFrame,
  Note,
  Panel,
  PartyLegend,
  ProbabilityBar,
  ProvenanceFooter,
} from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

const MAJORITY = Math.floor(UK_SEAT_TOTAL / 2) + 1;

/**
 * An outcome page is the self-contained record: headline, hemicycle, seat
 * map, share distributions, crosstabs, the caveat ledger and the
 * provenance footer (docs/09-terminus.md).
 */
export function OutcomeDetail({ outcomeId }: { readonly outcomeId: string }) {
  return (
    <Screen
      sectionId="outcomes"
      title={outcomeId}
      lede="Self-contained by design: everything needed to judge this result is on this page, including everything that was adjusted to produce it."
      actions={
        <>
          <Button disabled title="There is no chart to export.">
            Export PNG
          </Button>
          <Button disabled title="There is no table to export.">
            Export CSV
          </Button>
          <Button disabled title="There is no artefact bundle in R2.">
            Artefact bundle
          </Button>
        </>
      }
    >
      <Note tone="radiant" title="No such outcome">
        <p className="m-0">
          <code>{outcomeId}</code> cannot resolve: the Vault is empty.
        </p>
      </Note>

      <Panel title="Headline">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <ChartFrame
            title={`Hemicycle · ${UK_SEAT_TOTAL} seats`}
            chart={
              <Hemicycle
                seats={UK_SEAT_TOTAL}
                majority={MAJORITY}
                className="mx-auto max-w-[560px]"
              />
            }
          />
          <div className="space-y-4">
            <ProbabilityBar
              label="National shares"
              emptyNote="Per-option shares with intervals from the iteration ensemble."
            />
            <PartyLegend parties={partiesFor("uk")} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Seat map" flush>
          <MapFrame activeRung="nation" className="rounded-none border-0">
            <EmptyState title="No seat distributions" phase="P3">
              <p>A geography rollup needs a run to roll up.</p>
            </EmptyState>
          </MapFrame>
        </Panel>

        <Panel title="Crosstabs" flush>
          <DataTable
            caption="Crosstabs"
            columns={[
              { key: "group", header: "Group", render: () => null },
              {
                key: "share",
                header: "Share",
                render: () => null,
                numeric: true,
              },
              {
                key: "interval",
                header: "90% interval",
                render: () => null,
                numeric: true,
              },
            ]}
            rows={[]}
            rowKey={() => ""}
            empty="Cross-tabulate by any registry field, once there is a result to tabulate."
          />
        </Panel>
      </div>

      <Panel
        title="Caveat ledger"
        subtitle="Every declared adjustment, its parameters, its order of application and its provenance — a numbered list, not a footnote."
      >
        <EmptyState title="Caveats: none applied" phase="P3">
          <p>
            Said explicitly rather than left blank. Silence about an adjustment
            is never ambiguous here.
          </p>
        </EmptyState>
      </Panel>

      <ProvenanceFooter
        entries={[
          { label: "outcome", value: outcomeId },
          { label: "epoch", value: "", pending: true },
          { label: "scenario", value: "", pending: true },
          { label: "question", value: "", pending: true },
          { label: "seed", value: "", pending: true },
          { label: "sources", value: "", pending: true },
        ]}
        note="Each element links to what produced it: epoch to Population, scenario hash to Scenarios, question version to Questions, sources to the lineage graph."
      />
    </Screen>
  );
}
