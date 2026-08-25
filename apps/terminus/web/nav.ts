import type { Phase, TabItem } from "@seldon/ui";

/**
 * The information architecture of docs/09-terminus.md, as data.
 *
 * The left nav, the section tabs, the ⌘K palette and the deep-link route
 * tree are all generated from this one table, so a section cannot exist
 * in the nav and be missing from the palette — or the other way round.
 */
export interface Section {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /** The phase that fills this section with real data. */
  readonly phase: Phase;
  /** One line, used as the palette hint and the screen's lede. */
  readonly summary: string;
  readonly tabs?: readonly TabItem[];
}

export const SECTIONS: readonly Section[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/",
    phase: "P3",
    summary: "The First Crisis — the standing forecast, always already run",
  },
  {
    id: "population",
    label: "Population",
    href: "/population",
    phase: "P2",
    summary: "The living replica: map, explore, dossiers, epochs and forks",
    tabs: [
      { id: "map", label: "Map", href: "/population" },
      { id: "explore", label: "Explore", href: "/population/explore" },
      { id: "epochs", label: "Epochs", href: "/population/epochs" },
      { id: "forks", label: "Forks", href: "/population/forks" },
    ],
  },
  {
    id: "datasets",
    label: "Datasets",
    href: "/datasets",
    phase: "P1",
    summary: "The Encyclopedia's shopfront: catalogue, lineage and ingest runs",
    tabs: [
      { id: "catalogue", label: "Catalogue", href: "/datasets" },
      { id: "ingest", label: "Ingest runs", href: "/datasets/ingest-runs" },
      { id: "manual", label: "Needs a hand", href: "/datasets/needs-a-hand" },
      { id: "lineage", label: "Lineage", href: "/datasets/lineage" },
    ],
  },
  {
    id: "scenarios",
    label: "Scenarios",
    href: "/scenarios",
    phase: "P3",
    summary: "Explicit, versioned what-if assumptions",
    tabs: [
      { id: "all", label: "All scenarios", href: "/scenarios" },
      { id: "presets", label: "Presets", href: "/scenarios/presets" },
      { id: "compare", label: "Compare", href: "/scenarios/compare" },
    ],
  },
  {
    id: "questions",
    label: "Questions",
    href: "/questions",
    phase: "P3",
    summary: "Instruments, frames, resolvers, outcome functions and caveats",
    tabs: [
      { id: "all", label: "All questions", href: "/questions" },
      { id: "new", label: "Builder", href: "/questions/new" },
    ],
  },
  {
    id: "runs",
    label: "Runs",
    href: "/runs",
    phase: "P3",
    summary: "The queue, live progress, and run-to-run comparison",
    tabs: [
      { id: "queue", label: "Queue", href: "/runs" },
      { id: "compare", label: "Compare", href: "/runs/compare" },
    ],
  },
  {
    id: "outcomes",
    label: "Outcomes",
    href: "/outcomes",
    phase: "P3",
    summary: "The Vault — every prediction ever made, kept whole",
  },
  {
    id: "second-foundation",
    label: "Second Foundation",
    href: "/second-foundation",
    phase: "P4",
    summary: "Calibration, backtests against the null model, and drift",
    tabs: [
      { id: "calibration", label: "Calibration", href: "/second-foundation" },
      {
        id: "backtests",
        label: "Backtests",
        href: "/second-foundation/backtests",
      },
      { id: "drift", label: "Drift", href: "/second-foundation/drift" },
    ],
  },
];

export const NAV_ITEMS = SECTIONS.map(({ id, label, href }) => ({
  id,
  label,
  href,
}));

export function sectionById(id: string): Section {
  const section = SECTIONS.find((entry) => entry.id === id);
  if (!section) throw new Error(`no such section: ${id}`);
  return section;
}

/** Verbs the palette offers. Each lands on the screen that will own it. */
export interface Verb {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly phase: Phase;
}

export const VERBS: readonly Verb[] = [
  {
    id: "new-scenario",
    label: "New scenario",
    href: "/scenarios",
    phase: "P3",
  },
  {
    id: "new-question",
    label: "New question",
    href: "/questions/new",
    phase: "P3",
  },
  { id: "launch-run", label: "Launch a run", href: "/runs", phase: "P3" },
  {
    id: "rerun-standing",
    label: "Re-run the standing question",
    href: "/",
    phase: "P3",
  },
  {
    id: "explore-population",
    label: "Explore the population",
    href: "/population/explore",
    phase: "P2",
  },
  {
    id: "compare-runs",
    label: "Compare two runs",
    href: "/runs/compare",
    phase: "P3",
  },
  {
    id: "needs-a-hand",
    label: "Sources that need a hand",
    href: "/datasets/needs-a-hand",
    phase: "P1",
  },
  {
    id: "checksums",
    label: "Check source checksums",
    href: "/datasets",
    phase: "P1",
  },
];

/** Which section a URL belongs to — the left nav's active item. */
export function sectionIdForPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "overview";
  // A household dossier lives at /worlds/:worldId/households/:id but is a
  // Population screen, so the nav has to know that.
  if (pathname.startsWith("/worlds")) return "population";
  const [, head] = pathname.split("/");
  const section = SECTIONS.find(
    (entry) => entry.id === head || entry.href === `/${head}`,
  );
  return section?.id ?? "overview";
}

/** Which tab within a section, for the tab rail's active item. */
export function tabIdForPath(pathname: string): string | undefined {
  const section = SECTIONS.find(
    (entry) => entry.id === sectionIdForPath(pathname),
  );
  if (!section?.tabs) return undefined;
  const exact = section.tabs.find((tab) => tab.href === pathname);
  return (exact ?? section.tabs[0])?.id;
}
