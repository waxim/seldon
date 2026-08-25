import {
  Breadcrumb,
  Button,
  DslFilterBar,
  EmptyState,
  MapFrame,
  Panel,
  SidePanel,
} from "@seldon/ui";
import { useState } from "react";
import { Dossier } from "../../components/Dossier.js";
import { Screen } from "../../components/Screen.js";

const LAYERS = [
  "none",
  "modelled income band",
  "energy rating",
  "deprivation quintile",
  "current leaning",
];

/**
 * Map browse: the zoom ladder from nation down to a single front door,
 * with the dossier sliding in from the right (docs/09-terminus.md).
 * MapLibre GL mounts inside `MapFrame` once there are PMTiles to point it
 * at; the frame, the ladder and the panel are here now.
 */
export function PopulationMap() {
  const [predicate, setPredicate] = useState("");
  const [dossierOpen, setDossierOpen] = useState(false);

  return (
    <Screen
      sectionId="population"
      activeTab="map"
      lede="At any zoom you are looking at the same households, aggregated differently — so the filter and the layer follow you all the way down to a single house."
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel flush>
          <MapFrame
            className="rounded-none border-0"
            activeRung="nation"
            toolbar={
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-ink-faint">
                    Layer
                    <select className="rounded border border-hairline bg-surface-raised px-2 py-1 text-xs text-ink">
                      {LAYERS.map((layer) => (
                        <option key={layer}>{layer}</option>
                      ))}
                    </select>
                  </label>
                  <Breadcrumb
                    items={[{ label: "United Kingdom" }]}
                    label="Geography"
                  />
                  <div className="flex-1" />
                  <Button
                    className="xl:hidden"
                    onClick={() => setDossierOpen(true)}
                  >
                    Show the dossier panel
                  </Button>
                </div>
                <DslFilterBar
                  worldId="uk"
                  value={predicate}
                  onChange={setPredicate}
                  pendingNote="The field registry and its lint are real today; the match count needs a population to count."
                />
              </div>
            }
          >
            <EmptyState
              title="No epoch to draw"
              phase="P2"
              variant="page"
              fills={[
                "650-seat choropleth at nation and region zoom",
                "Ward boundaries inside a seat",
                "LSOA shading as streets emerge",
                "Individual household dots at street zoom",
                "Choropleth colour by the selected layer",
                "Keyboard panning, zooming and household cycling",
              ]}
            >
              <p>
                The canon has no epochs, so there are no household dots and no
                boundary tiles. Tiles are PMTiles archives in R2 fetched by HTTP
                range request — there is no tile server to be down.
              </p>
            </EmptyState>
          </MapFrame>
        </Panel>

        <Panel
          title="Dossier"
          subtitle="The panel that opens when you click a house. Its structure is real; every value is pending."
          className="hidden xl:block"
          bodyClassName="max-h-[calc(100vh-12rem)] overflow-y-auto"
        >
          <Dossier />
        </Panel>
      </div>

      <div className="xl:hidden">
        <SidePanel
          open={dossierOpen}
          onClose={() => setDossierOpen(false)}
          title="Dossier"
          subtitle="No household selected"
        >
          <Dossier />
        </SidePanel>
      </div>
    </Screen>
  );
}
