import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import type { JSX } from "react";
import { DatasetsCatalogue } from "./routes/datasets/Catalogue.js";
import { DatasetsIngestRuns } from "./routes/datasets/IngestRuns.js";
import { DatasetsLineage } from "./routes/datasets/Lineage.js";
import { DatasetsNeedsAHand } from "./routes/datasets/NeedsAHand.js";
import { DatasetsSource } from "./routes/datasets/Source.js";
import { NotFound } from "./routes/NotFound.js";
import { Overview } from "./routes/Overview.js";
import { OutcomesArchive } from "./routes/outcomes/Archive.js";
import { OutcomeDetail } from "./routes/outcomes/Detail.js";
import { PopulationEpochs } from "./routes/population/Epochs.js";
import { PopulationExplore } from "./routes/population/Explore.js";
import { PopulationForks } from "./routes/population/Forks.js";
import { Household } from "./routes/population/Household.js";
import { PopulationMap } from "./routes/population/Map.js";
import { QuestionsBuilder } from "./routes/questions/Builder.js";
import { QuestionDetail } from "./routes/questions/Detail.js";
import { QuestionsList } from "./routes/questions/List.js";
import { Root } from "./routes/Root.js";
import { RunsCompare } from "./routes/runs/Compare.js";
import { RunDetail } from "./routes/runs/Detail.js";
import { RunsQueue } from "./routes/runs/Queue.js";
import { ScenariosCompare } from "./routes/scenarios/Compare.js";
import { ScenarioDetail } from "./routes/scenarios/Detail.js";
import { ScenariosList } from "./routes/scenarios/List.js";
import { ScenariosPresets } from "./routes/scenarios/Presets.js";
import { SecondFoundationBacktests } from "./routes/second-foundation/Backtests.js";
import { SecondFoundationCalibration } from "./routes/second-foundation/Calibration.js";
import { SecondFoundationDrift } from "./routes/second-foundation/Drift.js";

/**
 * Every entity has a canonical URL, so any state of the console is a
 * shareable link (docs/09-terminus.md). The tree is written by hand
 * rather than generated, because it is also the map of the product: eight
 * sections, one level of tabs, and a deep-link route per entity kind.
 */
const rootRoute = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
});

const route = (path: string, component: () => JSX.Element) =>
  createRoute({ getParentRoute: () => rootRoute, path, component });

const overviewRoute = route("/", Overview);

const populationRoute = route("/population", PopulationMap);
const exploreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/population/explore",
  validateSearch: (search: Record<string, unknown>): { where: string } => ({
    where: typeof search.where === "string" ? search.where : "",
  }),
  component: function ExploreScreen() {
    const { where } = exploreRoute.useSearch();
    return <PopulationExplore initialPredicate={where} key={where} />;
  },
});
const epochsRoute = route("/population/epochs", PopulationEpochs);
const forksRoute = route("/population/forks", PopulationForks);

const householdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/worlds/$worldId/households/$householdId",
  component: function HouseholdScreen() {
    const { worldId, householdId } = householdRoute.useParams();
    return <Household worldId={worldId} householdId={householdId} />;
  },
});

const datasetsRoute = route("/datasets", DatasetsCatalogue);
const ingestRunsRoute = route("/datasets/ingest-runs", DatasetsIngestRuns);
const needsAHandRoute = route("/datasets/needs-a-hand", DatasetsNeedsAHand);
const lineageRoute = route("/datasets/lineage", DatasetsLineage);
const sourceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/datasets/$sourceId",
  component: function SourceScreen() {
    const { sourceId } = sourceRoute.useParams();
    return <DatasetsSource sourceId={sourceId} />;
  },
});

const scenariosRoute = route("/scenarios", ScenariosList);
const presetsRoute = route("/scenarios/presets", ScenariosPresets);
const scenarioCompareRoute = route("/scenarios/compare", ScenariosCompare);
const scenarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios/$scenarioId",
  component: function ScenarioScreen() {
    const { scenarioId } = scenarioRoute.useParams();
    return <ScenarioDetail scenarioId={scenarioId} />;
  },
});

const questionsRoute = route("/questions", QuestionsList);
const questionBuilderRoute = route("/questions/new", QuestionsBuilder);
const questionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions/$questionId",
  component: function QuestionScreen() {
    const { questionId } = questionRoute.useParams();
    return <QuestionDetail questionId={questionId} />;
  },
});

const runsRoute = route("/runs", RunsQueue);
const runsCompareRoute = route("/runs/compare", RunsCompare);
const runRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/runs/$runId",
  component: function RunScreen() {
    const { runId } = runRoute.useParams();
    return <RunDetail runId={runId} />;
  },
});

const outcomesRoute = route("/outcomes", OutcomesArchive);
const outcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/outcomes/$outcomeId",
  component: function OutcomeScreen() {
    const { outcomeId } = outcomeRoute.useParams();
    return <OutcomeDetail outcomeId={outcomeId} />;
  },
});

const secondFoundationRoute = route(
  "/second-foundation",
  SecondFoundationCalibration,
);
const backtestsRoute = route(
  "/second-foundation/backtests",
  SecondFoundationBacktests,
);
const driftRoute = route("/second-foundation/drift", SecondFoundationDrift);

const routeTree = rootRoute.addChildren([
  overviewRoute,
  populationRoute,
  exploreRoute,
  epochsRoute,
  forksRoute,
  householdRoute,
  datasetsRoute,
  ingestRunsRoute,
  needsAHandRoute,
  lineageRoute,
  sourceRoute,
  scenariosRoute,
  presetsRoute,
  scenarioCompareRoute,
  scenarioRoute,
  questionsRoute,
  questionBuilderRoute,
  questionRoute,
  runsRoute,
  runsCompareRoute,
  runRoute,
  outcomesRoute,
  outcomeRoute,
  secondFoundationRoute,
  backtestsRoute,
  driftRoute,
]);

/**
 * A router per call, so tests can drive the same tree over an in-memory
 * history without the module-level singleton leaking between them.
 */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    ...(history ? { history } : {}),
  });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
