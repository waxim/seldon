import { UK_SEAT_TOTAL } from "@seldon/geo";
import {
  ChartFrame,
  DefinitionList,
  EmptyState,
  FanChart,
  Hemicycle,
  Note,
  Panel,
  ProvenanceFooter,
} from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

/**
 * Live progress: Terminus opens a WebSocket to the run's coordinator DO
 * and renders the progress rail, the converging headline and a seat map
 * colouring in as per-seat distributions stabilise (docs/09-terminus.md).
 * On completion the screen becomes the outcome page without navigating.
 */
export function RunDetail({ runId }: { readonly runId: string }) {
  return (
    <Screen
      sectionId="runs"
      title={runId}
      lede="The stream is resumable: a reconnect replays from the last sequence number, so a closed laptop costs nothing."
    >
      <Note tone="radiant" title="No such run">
        <p className="m-0">
          <code>{runId}</code> cannot resolve: nothing has been run. Below is
          the shape this page takes while a run is in flight.
        </p>
      </Note>

      <Panel title="Progress">
        <div className="space-y-4">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-label="Iterations completed"
            aria-valuenow={0}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full w-0 bg-radiant" />
          </div>
          <DefinitionList
            columns={3}
            items={[
              { term: "iterations", value: "—", pending: true },
              { term: "seats resolved", value: "—", pending: true },
              { term: "shard health", value: "—", pending: true },
            ]}
          />
          <p className="m-0 text-xs text-ink-faint" aria-live="polite">
            Progress is announced at coarse milestones, not per tick.
          </p>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="The converging headline">
          <ChartFrame
            title="Seat count · 90% interval"
            caption="The fan narrows as iterations accumulate — uncertainty visibly collapsing."
            chart={
              <FanChart
                domainY={[0, 400]}
                xLabel="iterations"
                empty={
                  <p className="m-0 max-w-[32ch] text-xs text-ink-faint">
                    No iterations have been drawn, so there is no interval to
                    narrow.
                  </p>
                }
              />
            }
          />
        </Panel>

        <Panel title="Seats as they settle">
          <ChartFrame
            title={`Hemicycle · ${UK_SEAT_TOTAL} seats`}
            caption="Seats colour in as their per-seat distributions stabilise; those still under the call threshold stay hatched."
            chart={
              <Hemicycle
                seats={UK_SEAT_TOTAL}
                className="mx-auto max-w-[520px]"
              />
            }
          />
        </Panel>
      </div>

      <Panel title="Shards">
        <EmptyState title="No shards to coordinate" phase="P3">
          <p>
            A run fans out across 650 constituency shards in parallel, each a
            SQLite-backed Durable Object. The coordinator tracks their health
            here.
          </p>
        </EmptyState>
      </Panel>

      <ProvenanceFooter
        entries={[
          { label: "run", value: runId },
          { label: "question", value: "", pending: true },
          { label: "scenario", value: "", pending: true },
          { label: "epoch", value: "", pending: true },
          { label: "seed", value: "", pending: true },
          { label: "engine", value: "", pending: true },
        ]}
      />
    </Screen>
  );
}
