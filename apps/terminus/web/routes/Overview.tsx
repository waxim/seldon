import { UK_SEAT_TOTAL } from "@seldon/geo";
import { partiesFor } from "@seldon/parties";
import {
  ChartFrame,
  DataTable,
  EmptyState,
  Hemicycle,
  MapFrame,
  Note,
  Panel,
  PartyLegend,
  ProvenanceFooter,
  StatusPill,
} from "@seldon/ui";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "../components/Screen.js";
import { healthQuery, worldsQuery } from "../lib/api.js";

const MAJORITY = Math.floor(UK_SEAT_TOTAL / 2) + 1;

/**
 * The home page is the standing election question, permanently answered —
 * once there is a run to answer it (docs/09-terminus.md). Until then the
 * chamber is drawn unanswered, because a headline invented for a demo is
 * exactly the kind of number this system exists to refuse.
 */
export function Overview() {
  const parties = partiesFor("uk");

  return (
    <Screen
      sectionId="overview"
      title="The First Crisis"
      lede="If a general election were held today, how would the country vote? The standing question, its scenario and the latest canon epoch, re-run on cadence by Second Foundation."
    >
      <Panel
        title="The standing forecast"
        subtitle="Point estimates never appear without their interval; seats under an 80% call probability render hatched rather than solid."
      >
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <ChartFrame
            title={`Hemicycle · ${UK_SEAT_TOTAL} seats`}
            caption={`The dashed line marks ${MAJORITY} seats — the majority threshold.`}
            chart={
              <Hemicycle
                seats={UK_SEAT_TOTAL}
                majority={MAJORITY}
                className="mx-auto max-w-[560px]"
                centre={
                  <p className="m-0 text-xs text-ink-faint">
                    {UK_SEAT_TOTAL} seats, none called
                  </p>
                }
              />
            }
            table={
              <DataTable
                caption="Seats by party"
                columns={[
                  { key: "party", header: "Party", render: () => null },
                  {
                    key: "seats",
                    header: "Seats",
                    render: () => null,
                    numeric: true,
                  },
                  {
                    key: "range",
                    header: "90% range",
                    render: () => null,
                    numeric: true,
                  },
                ]}
                rows={[]}
                rowKey={() => ""}
                empty="No run has resolved a seat yet."
              />
            }
          />

          <EmptyState title="No headline yet" phase="P3">
            <p>
              The engine has not run, so there is no seat count and no interval
              to put beside it.
            </p>
          </EmptyState>
        </div>

        <div className="mt-6 border-t border-hairline pt-4">
          <p className="m-0 mb-2 text-xs tracking-[0.08em] text-ink-faint uppercase">
            Party colours · the only saturated hues on any data surface
          </p>
          <PartyLegend parties={parties} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="National map"
          subtitle="Seat choropleth, click-through to Population."
          flush
        >
          <MapFrame activeRung="nation" className="rounded-none border-0">
            <EmptyState title="No tiles to draw" phase="P2">
              <p>
                Boundaries and household dots ship as PMTiles archives in R2,
                one set per world and one per epoch. Neither exists yet.
              </p>
            </EmptyState>
          </MapFrame>
        </Panel>

        <Panel
          title="Movement"
          subtitle="Seats changing hands since the previous run and the previous epoch — and which sources refreshed to cause it."
        >
          <DataTable
            caption="Seats changing hands"
            columns={[
              { key: "seat", header: "Seat", render: () => null },
              { key: "from", header: "From", render: () => null },
              { key: "to", header: "To", render: () => null },
              {
                key: "delta",
                header: "Δ share",
                render: () => null,
                numeric: true,
              },
              { key: "why", header: "Why", render: () => null },
            ]}
            rows={[]}
            rowKey={() => ""}
            empty="Movement needs two runs to compare. There are none."
          />
        </Panel>
      </div>

      <WalkingSkeleton />

      <ProvenanceFooter
        entries={[
          { label: "epoch", value: "", pending: true },
          { label: "scenario", value: "", pending: true },
          { label: "question", value: "", pending: true },
          { label: "seed", value: "", pending: true },
          { label: "engine", value: "", pending: true },
        ]}
        note="The reproducibility tuple fills in from the standing run. Every element links to the thing that produced it — epoch to Population, scenario hash to Scenarios, question version to Questions, sources to the lineage graph."
      />
    </Screen>
  );
}

/** The one thing that does answer today: the request path, end to end. */
function WalkingSkeleton() {
  const health = useQuery(healthQuery);
  const worlds = useQuery(worldsQuery);

  return (
    <Panel
      title="What answers today"
      subtitle="Browser → @seldon/client → Demerzel → service RPC. The walking skeleton of P0, shown rather than claimed."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="m-0 mb-2 text-xs tracking-[0.08em] text-ink-faint uppercase">
            Gateway health
          </p>
          {health.isPending ? (
            <p className="m-0 text-sm text-ink-muted">Asking the gateway…</p>
          ) : health.isError ? (
            <Note tone="negative">
              <p className="m-0">Gateway unreachable: {health.error.message}</p>
            </Note>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              <li>
                <StatusPill status={health.data.status} label="demerzel" />
              </li>
              {(health.data.checks ?? []).map((check) => (
                <li key={check.name}>
                  <StatusPill status={check.status} label={check.name} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="m-0 mb-2 text-xs tracking-[0.08em] text-ink-faint uppercase">
            Worlds, straight from Radiant
          </p>
          <DataTable
            caption="Worlds known to Radiant"
            columns={[
              {
                key: "name",
                header: "World",
                render: (world) => world.name,
              },
              {
                key: "seats",
                header: "Seats",
                render: (world) => world.seatCount.toLocaleString("en-GB"),
                numeric: true,
              },
              {
                key: "epoch",
                header: "Live epoch",
                render: (world) => (
                  <code className="text-ink-muted">
                    {world.epochId ?? "none yet"}
                  </code>
                ),
              },
            ]}
            rows={worlds.data ?? []}
            rowKey={(world) => world.worldId}
            empty={
              worlds.isPending
                ? "Asking Radiant…"
                : worlds.isError
                  ? worlds.error.message
                  : "Radiant knows of no worlds yet."
            }
          />
        </div>
      </div>
    </Panel>
  );
}
