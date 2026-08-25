import { Breadcrumb, Note, Panel } from "@seldon/ui";
import { Dossier } from "../../components/Dossier.js";
import { Screen } from "../../components/Screen.js";

/**
 * The dossier as a page: `/worlds/:worldId/households/:householdId` is a
 * canonical, shareable URL for a single front door (docs/09-terminus.md).
 */
export function Household({
  worldId,
  householdId,
}: {
  readonly worldId: string;
  readonly householdId: string;
}) {
  return (
    <Screen
      sectionId="population"
      title="Household dossier"
      lede="Every household has a canonical URL, so any state of the console is a shareable link."
      meta={
        <Breadcrumb
          items={[
            { label: worldId, href: "/population" },
            { label: "households" },
            { label: householdId },
          ]}
          label="Household path"
        />
      }
    >
      <Note tone="radiant" title="No such household — yet">
        <p className="m-0">
          <code>{householdId}</code> cannot resolve: the canon has no epochs, so
          there are no households to address. The panel below is the shape this
          page takes once one exists.
        </p>
      </Note>

      <Panel title="Dossier">
        <Dossier worldId={worldId} />
      </Panel>
    </Screen>
  );
}
