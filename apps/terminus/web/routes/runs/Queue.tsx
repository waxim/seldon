import {
  Button,
  Chip,
  DataTable,
  DefinitionList,
  Note,
  Panel,
  SidePanel,
} from "@seldon/ui";
import { useState } from "react";
import { Screen } from "../../components/Screen.js";

/** Pending, active and finished runs — with `latest` a first-class chip. */
export function RunsQueue() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Screen
      sectionId="runs"
      activeTab="queue"
      actions={
        <Button variant="primary" onClick={() => setDrawerOpen(true)}>
          Launch a run
        </Button>
      }
    >
      <Panel title="Queue" flush>
        <DataTable
          caption="Runs"
          columns={[
            { key: "id", header: "Run", render: () => null },
            { key: "question", header: "Question", render: () => null },
            { key: "scenario", header: "Scenario", render: () => null },
            { key: "population", header: "Population", render: () => null },
            {
              key: "iterations",
              header: "Iterations",
              render: () => null,
              numeric: true,
            },
            { key: "state", header: "State", render: () => null },
            { key: "started", header: "Started", render: () => null },
          ]}
          rows={[]}
          rowKey={() => ""}
          empty="Nothing has ever been run. A run needs a question, a scenario and a population; none of the three exists."
        />
      </Panel>

      <Note>
        <p className="m-0">
          <Chip tone="radiant">latest</Chip> is a first-class chip anywhere a
          run is referenced, so a link can mean “whatever answered most
          recently” without pinning a stale id.
        </p>
      </Note>

      <SidePanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Launch a run"
        subtitle="The full reproducibility tuple is shown before you confirm."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled
              title="The engine lands in P3 — there is nothing to run."
            >
              Confirm
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <DefinitionList
            columns={1}
            items={[
              { term: "question", value: "no questions exist", pending: true },
              { term: "scenario", value: "no scenarios exist", pending: true },
              {
                term: "population",
                value: "no epochs or forks exist",
                pending: true,
              },
              { term: "iterations", value: "—", pending: true },
              { term: "seed", value: "—", pending: true },
              { term: "engine version", value: "—", pending: true },
            ]}
          />
          <Note title="Why the tuple is shown first">
            <p className="m-0">
              Question version, scenario hash, epoch, seed and engine version
              are what make a result reproducible. You confirm the tuple, not
              just the button.
            </p>
          </Note>
        </div>
      </SidePanel>
    </Screen>
  );
}
