import { Chip, DataTable, EmptyState, Note, Panel } from "@seldon/ui";
import { Screen } from "../../components/Screen.js";

const INSTRUMENTS = [
  {
    id: "single-choice",
    space: "Exactly one option from a list",
    example: "Vote intent",
  },
  {
    id: "approval",
    space: "Yes / no, plus non-substantive options",
    example: "Approve of the government's record",
  },
  {
    id: "likert",
    space: "An ordered 5- or 7-point scale",
    example: "The economy will improve",
  },
  {
    id: "numeric",
    space: "A number in a declared range and unit",
    example: "Likelihood of voting, 0–10",
  },
];

const RESOLVERS = [
  { id: "vote-intent", forWhat: "single-choice over parties" },
  { id: "attitude", forWhat: "approval, likert and numeric" },
  { id: "turnout", forWhat: "probability of voting" },
];

const OUTCOME_FUNCTIONS = [
  {
    id: "national-shares",
    output: "Per-option share, with intervals from the ensemble",
  },
  {
    id: "fptp-seats",
    output: "Seat counts, ranges, majority maths, P(hung parliament)",
  },
  { id: "crosstab", output: "Shares broken down by any registry field" },
  { id: "geo-rollup", output: "Shares aggregated at seat, ward or area level" },
  { id: "numeric-summary", output: "Mean, median and deciles" },
];

const CAVEATS = [
  {
    rank: 10,
    id: "turnout-weighting",
    what: "Weights each answer by the person's probability of actually voting.",
  },
  {
    rank: 20,
    id: "shy-response",
    what: "Corrects stated shares for systematic under-reporting. Factors come provenance-stamped from calibration, never hand-set.",
  },
  {
    rank: 30,
    id: "dont-know-reallocation",
    what: "Resolves the non-substantive mass: exclude, spread pro-rata, or apply the house model.",
  },
];

/**
 * The question builder walks the document model of docs/07-questions.md.
 * The registries below are the declared v1 sets — real contracts, with no
 * question yet to apply them to.
 */
export function QuestionsBuilder() {
  return (
    <Screen
      sectionId="questions"
      activeTab="new"
      lede="Instrument, frame, resolver, outcome function, caveats. Nothing about an ask is implicit — including who would be asked and what was adjusted afterwards."
    >
      <Panel
        title="1 · Instrument"
        subtitle="The answer space and its type. Don't-know and won't-say are explicit options, never an implicit residue."
      >
        <DataTable
          caption="Instruments"
          columns={[
            {
              key: "id",
              header: "Type",
              render: (row) => <code className="text-ink">{row.id}</code>,
            },
            {
              key: "space",
              header: "Answer space",
              render: (row) => row.space,
            },
            {
              key: "example",
              header: "Example",
              render: (row) => (
                <span className="text-ink-muted">{row.example}</span>
              ),
            },
          ]}
          rows={INSTRUMENTS}
          rowKey={(row) => row.id}
          empty=""
        />
      </Panel>

      <Panel
        title="2 · Frame"
        subtitle="A DSL predicate naming who would be asked, with a live count of them."
      >
        <EmptyState title="Nobody to frame" phase="P2">
          <p>
            The frame is written in the same predicate DSL as explore. Its live
            count needs a population, which arrives with Radiant.
          </p>
        </EmptyState>
      </Panel>

      <Panel
        title="3 · Resolver"
        subtitle="The named, versioned function family that maps a cell to a distribution over the options."
      >
        <DataTable
          caption="Resolvers"
          columns={[
            {
              key: "id",
              header: "Resolver",
              render: (row) => <code className="text-ink">{row.id}</code>,
            },
            { key: "for", header: "For", render: (row) => row.forWhat },
            {
              key: "version",
              header: "Pinned version",
              render: () => <span className="text-ink-faint">—</span>,
            },
          ]}
          rows={RESOLVERS}
          rowKey={(row) => row.id}
          empty=""
        />
      </Panel>

      <Panel
        title="4 · Outcome function"
        subtitle="How resolved distributions become a result. Every function outputs distributions, not points."
      >
        <DataTable
          caption="Outcome functions"
          columns={[
            {
              key: "id",
              header: "Function",
              render: (row) => <code className="text-ink">{row.id}</code>,
            },
            { key: "output", header: "Output", render: (row) => row.output },
          ]}
          rows={OUTCOME_FUNCTIONS}
          rowKey={(row) => row.id}
          empty=""
        />
      </Panel>

      <Panel
        title="5 · Caveats"
        subtitle="Declared adjustments applied between resolution and the reported outcome. The order is part of each caveat's contract, not a convenience."
      >
        <DataTable
          caption="Caveats"
          columns={[
            {
              key: "rank",
              header: "Rank",
              render: (row) => <Chip tone="outline">{row.rank}</Chip>,
              numeric: true,
            },
            {
              key: "id",
              header: "Caveat",
              render: (row) => <code className="text-ink">{row.id}</code>,
            },
            {
              key: "what",
              header: "What it adjusts",
              render: (row) => (
                <span className="text-ink-muted">{row.what}</span>
              ),
            },
          ]}
          rows={CAVEATS}
          rowKey={(row) => row.id}
          empty=""
        />
      </Panel>

      <Note tone="radiant" title="No silent adjustments">
        <p className="m-0">
          If the headline is not the raw aggregate, every step in between is
          named, parameterised, ordered and disclosed. An outcome with no
          caveats says “caveats: none applied” out loud — silence is never
          ambiguous.
        </p>
      </Note>
    </Screen>
  );
}
