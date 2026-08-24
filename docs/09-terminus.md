# Terminus — the console

*Every plan needs a window to be watched through; Terminus is ours, built at
the edge where the map runs out.*

Terminus is the entire user surface of Seldon: a single web console through
which every workflow happens — watching the standing forecast, browsing the
living replica down to a single front door, tending datasets, authoring
scenarios and questions, launching runs, and opening outcomes in the Vault.
There is no CLI product; anything v2 expressed as a command, Terminus
expresses as a screen. This document specifies the information
architecture, every screen, the map and dossier experience, explore mode,
the live-run streaming UX, the "Foundation modern" design language at token
level, the frontend stack, and the accessibility bar. API shapes and auth
internals belong to [the API doc](11-api.md); population semantics to
[the population doc](04-population.md).

## From commands to screens

The v2 CLI ([history](../v2/07-cli.md)) is discarded as a product but kept
as a workflow inventory: each command named something a user genuinely needs
to do. Terminus owes each of them a home.

| v2 workflow | Terminus home |
| --- | --- |
| `seldon now` | Overview — the standing forecast, always already run |
| `data list/status`, `sync`, `verify` | Datasets catalogue + ingest runs + checksum panel |
| `data recover <id> <file>` | "Needs a hand" queue with guided upload |
| `data lineage <table>` | Lineage graph view |
| `synthesise`, `population list/show` | Population → Epochs |
| `population fork --skew` | Population → Forks (skew builder) |
| `scenario new/edit/lint` | Scenario editor: rule cards, inline lint |
| `run`, `runs`, `diff <a> <b>` | Runs — launch drawer, queue, progress, compare |
| `report` | Outcome page + export |
| `explore count/sample/breakdown` | Population → Explore mode |
| `backtest`, `calibrate` | Second Foundation |
| `doctor` | Freshness/drift surfaced in place, never a separate ritual |

Two v2 UX rules survive verbatim: **freshness is surfaced, not silent**
(anything rendered from data older than its declared cadence carries a
staleness chip), and **seat addressing is forgiving** (ONS code or fuzzy
name, one resolver, everywhere including the command palette).

## Information architecture

```
Terminus
├── Overview            # the First Crisis — the standing forecast
├── Population          # map browse · explore · dossiers · epochs · forks
├── Datasets            # catalogue · lineage · ingest runs · needs-a-hand
├── Scenarios           # list · visual editor · diff · lint
├── Questions           # instrument · frame · resolver · caveats · versions
├── Runs                # queue · live progress · compare
├── Outcomes            # the Vault — results archive
├── Second Foundation   # calibration · backtests vs UNS · drift
└── ⌘K command palette  # global, DSL-aware
```

The left nav is fixed and shallow — eight sections, one level deep. A
world switcher sits above it (the UK is the first world; switching worlds
re-scopes every screen). Every entity — epoch, fork, scenario, question,
run, outcome, dataset, household — has a canonical URL, so any state of
the console is a shareable link.

The **command palette** (⌘K) is the power surface: fuzzy navigation
("stroud" → the seat page; "E14001479" works too), verbs ("new scenario",
"re-run standing question"), and — because it embeds the `@seldon/dsl`
parser — typing a predicate like `age > 65 && tenure == social_rent`
offers "Explore this filter" directly.

## The screens

### Overview — the First Crisis

The home page is the standing election question, permanently answered:
question + `current-polling` scenario + latest canon epoch, re-run on
cadence by Second Foundation (see [questions](07-questions.md)).

- **Headline band**: "Reform largest party — 8 short of a majority", with
  the 90% seat range beside every number. Point estimates never appear
  without their interval.
- **Hemicycle**: the signature visual. 650 seats, party-coloured from
  `@seldon/parties`; seats whose call probability is under 80% render
  hatched, not solid — an uncertainty fringe rather than a firm claim.
- **National map**: seat choropleth thumbnail, click-through to Population.
- **Movement**: deltas since the previous run and previous epoch — seats
  changing hands, share drift, and *why* (which sources refreshed).
- **Footer**: provenance strip — the full reproducibility tuple plus
  staleness chips per source, always one glance away.

### Population

The heart of the brief: *at any time you can click a house and see rich
information about it.* Three cooperating modes — map, explore, management
(epochs & forks) — all scoped to a selected population (canon epoch or
fork).

```
┌────────────────────────────────────────────────────────────────┐
│ [uk ▾]  [epoch 2026-07 ▾]  [layer: none ▾]   [DSL filter bar ]│
├──────────────────────────────────────────────┬─────────────────┤
│                                              │  DOSSIER        │
│                map / explore                 │  12 Mill Rd (s) │
│         (MapLibre GL + PMTiles)              │  persons · attrs│
│                                              │  leanings · hist│
├──────────────────────────────────────────────┴─────────────────┤
│ breadcrumb: England › South West › Stroud › Cainscross › street│
└────────────────────────────────────────────────────────────────┘
```

**The zoom ladder.** Every rung is an aggregation of the same underlying
households, so the filter bar and layer choropleth follow you all the way
down:

| Rung | MapLibre zoom | Rendered as | Click yields |
| --- | --- | --- | --- |
| Nation | z4–5 | seat choropleth (650 polygons) | region summary |
| Region | z6–7 | seat choropleth, labels on | seat summary |
| Seat | z8–9 | ward boundaries within the seat | ward summary |
| Ward | z10–12 | LSOA shading, streets emerge | street summary |
| Street | z13+ | individual household dots | **the dossier** |

Choropleths colour by the selected layer (modelled income band, energy
rating, deprivation quintile, current leaning…); at street zoom the same
layer colours the dots. Tiles are PMTiles archives in R2 — one boundary
set per world, one household-dot set per epoch — fetched by HTTP range
request, no tile server ([architecture](03-architecture.md)). A
persistent caption states the privacy line: *households are synthetic;
positions are density-plausible, never real addresses*
([population](04-population.md) has the full treatment).

**The dossier panel.** Clicking a dot slides a panel in from the right —
never a modal; the map stays live for orientation. Top to bottom:

1. **Address-ish header**: synthetic identifier, street, ward, seat —
   plus the standing "synthetic household" badge.
2. **Household attributes**, grouped by layer, each value wearing its
   layer badge — `base` (census-derived), `modelled`, or `contextual` —
   and expanding to its provenance chain (source id → data version →
   transform), one click from any number to the dataset that fed it.
3. **Persons**: a card per person — age band, sex, qualification,
   activity, registration status.
4. **Leanings**: current modelled vote-intent distribution joined from the
   standing run's cell probabilities — drawn as a probability bar, never a
   single party label, with the cell signature shown so the aggregation is
   honest.
5. **Question history**: what this household's cell answered across runs.
6. **What touched this household**: which scenario rules and Mule events
   matched it in the run being viewed — the effect chain made legible.

The panel is keyboard-reachable (arrow keys walk neighbouring households),
deep-linkable (`/worlds/uk/households/:id`), and identical in structure at
every aggregation rung above household — a ward's "dossier" is the same
panel showing counts and breakdowns instead of persons.

**Explore mode.** Toggled from the filter bar. The bar accepts the
predicate DSL with full editor affordances: typed autocomplete from the
field registry, inline diagnostics (an unknown field is a compile error,
squiggled at the offending token — see [scenarios](06-scenarios.md) for
the grammar), and a live match count that updates as you type.

```
where: sex == male && age > 50 && !degree && income < 50000
                                            ── 1,912,406 persons · 3.9% ──
```

Three result views, mirroring v2's `explore`: **count** (matched
persons/households, nationally and per rung — the map dims non-matching
areas so the filter is *visible geographically*), **breakdown**
(cross-tabulate matches by any registry field or layer), and **sample**
(a seeded, reproducible sample of matching households, each opening its
dossier). Any predicate built here can be saved onward as a question
frame, a scenario rule `when`, or a bookmark — one DSL, every door.

**Epochs & forks.** A management tab lists the canon's epochs (id, data
version, synthesis config, fidelity report, artefacts) and all forks. The
fork builder composes ordered skew ops — add/remove cohort, age-shift,
scale band, tenure shift, registration rate — each op a card with a live
estimated-impact count; lineage renders as a small graph from the parent
epoch. Semantics live in [population](04-population.md).

### Datasets

The Encyclopedia's shopfront ([datasets](05-datasets.md) owns the
substance).

- **Catalogue**: every source manifest as a row — tier, publisher,
  licence, cadence, last fetched, checksum state, freshness chip; scraped
  polls wear their `fragile` badge.
- **Source detail**: manifest rendered, fetch history, `expect` guard
  results, checksum panel with the explicit **re-pin** action (destructive
  → typed confirmation, audited).
- **Lineage graph**: derived table → sources → versions, an interactive
  DAG entered from any provenance link anywhere in the console.
- **Needs a hand**: the queue of `manual/needs-url` sources — per-source
  instructions and a guided upload through the same verify/stage pipeline.
- **Ingest runs**: live and historical Workflow executions, stage by stage
  (fetch → verify → stage → load → derive), with loud failure detail.

### Scenarios

A scenario is a versioned document ([scenarios](06-scenarios.md)); the
editor makes it legible to a non-author.

- **List**: presets and user scenarios, hash-stamped, "extends" lineage
  shown.
- **Editor**: national/regional targets as sliders-with-numerals;
  headwinds; **rules as cards** — each card a `when` predicate (the same
  DSL editor as explore) plus its effect, wearing a *live
  matched-population count* so "men over 50 without a degree on under
  £50k" is never an abstraction; tactical transfer cards; **Mule event**
  cards with onset/magnitude/decay sparkline previews.
- **Lint**: field validation and effect sanity ranges, inline, blocking
  on save-as-version.
- **Diff**: two scenarios (or two versions) side by side, rule-level.

### Questions

The question builder walks the document model of
[questions](07-questions.md): instrument (single-choice, approval, Likert,
numeric — don't-know/won't-say explicit), frame (DSL predicate with live
count of who would be asked), resolver picker with parameter forms,
outcome-function picker, and the **caveat picker** — each caveat a card
stating what it adjusts and in what order, because no outcome ships with
a silent adjustment. Version history with diffs; "run this" pre-fills the
Runs launch drawer.

### Runs

- **Launch drawer**: question + scenario + population (epoch or fork) +
  iterations + seed; the full reproducibility tuple is shown before
  confirm.
- **Queue**: pending/active/finished, filterable; `latest` is a
  first-class chip anywhere a run is referenced.
- **Live progress** — the streaming UX. Terminus opens a WebSocket to the
  run's coordinator DO (contract in [the API doc](11-api.md); mechanics in
  [the engine doc](08-engine.md)) and renders a progress rail (iterations
  completed, seats resolved, shard health), the **converging headline** —
  a seat-count fan chart that narrows live as iterations accumulate,
  uncertainty visibly collapsing — and a seat map colouring in as
  per-seat distributions stabilise. The stream is resumable: reconnects
  replay from the last sequence number; a closed laptop costs nothing.
  On completion the screen becomes the outcome page without navigation.
- **Compare**: two runs side by side — headline deltas, seats changing
  hands (sortable table + map of changes), distribution overlays, and a
  tuple diff that states *why* they differ (scenario hash? epoch? seed?).

### Outcomes — the Vault

The archive of every prediction ever made. An outcome page is the
self-contained record:

- headline + hemicycle + seat map + national share distributions;
- crosstabs (by any registry field) and geography rollups;
- the **caveat ledger**: every declared adjustment, its parameters, order
  of application, and provenance — a numbered list, not a footnote;
- the **provenance footer**: the reproducibility tuple, each element
  linked — epoch → Population, scenario hash → Scenarios, question
  version → Questions, sources → lineage graph;
- export: PNG of any chart, CSV of any table, a JSON artefact bundle
  from R2.

### Second Foundation

The honesty page. Calibration state (current shock sigmas and their
provenance), the backtest scoreboard — engine vs the UNS null model on
seat calls, multi-class Brier, interval coverage against the ~90/90
target — drift alerts, and the source-staleness watch. Nothing here is
decorative: if the engine is not beating UNS, this page says so in the
headline position ([engine](08-engine.md) covers the execution split).

## Design language — "Foundation modern"

Dark by default — deep space, not grey — with a supported light theme.
The thesis: a starfield of data with one warm, radiant accent; the
interface recedes, the numbers advance. Tokens live in `@seldon/ui`;
reference values below, the token names are the contract.

| Token | Dark (default) | Light |
| --- | --- | --- |
| `--void` (app background) | `#0A0E1A` | `#F7F6F2` |
| `--surface` (panels, cards) | `#111726` | `#FFFFFF` |
| `--surface-raised` | `#18203A` | `#FFFFFF` + shadow |
| `--ink` (primary text) | `#E9ECF5` | `#171B26` |
| `--ink-muted` | `#9AA3B8` | `#5A6172` |
| `--radiant` (accent, warm gold) | `#E3B34C` | `#B78A2E` |
| `--hairline` | `#232C45` | `#E3E1DA` |
| `--positive` / `--negative` | `#4CC38A` / `#E5484D` | darkened variants |

The radiant gold is rationed: focus rings, the active nav item, the
standing-question headline, live-run progress. It never fights party
colours, which come exclusively from `@seldon/parties` and are the only
saturated hues on any data surface. The **Prime Radiant motif** — fine
radial hairlines and a sparse starfield — appears at 2–4% opacity on the
Overview and empty states only: texture, never noise, never behind dense
data.

**Type.** One humanist sans for UI and prose (reference face: Source Sans
3; system-ui fallback), with `font-variant-numeric: tabular-nums` on
every numeric surface so seat-count columns align and live numbers don't
shimmy. A monospace (reference: IBM Plex Mono) for DSL predicates,
hashes, ids, and provenance footers. Scale: 13/14/16/20/28/40px; line
height 1.5 for prose, 1.15 for display numerals.

**Motion.** Three durations — 120ms (hover, focus), 200ms (panel slide,
palette open), 320ms (map camera, fan-chart settle) — all ease-out;
nothing bounces. Charts animate by data update, not decoration.
`prefers-reduced-motion` collapses all three to near-zero and replaces
the fan-chart settle with a discrete redraw.

**Data rules.** Uncertainty is always visualised: ranges, fans, hatched
low-confidence seats — a bare point estimate is a design-review failure.
Charts share one visual grammar (hemicycle, choropleth, fan, probability
bar) exported from `@seldon/ui`, so an outcome page and the Overview
cannot drift apart.

## Stack

React 19 + Vite; TanStack Router (every entity URL is a typed route) and
TanStack Query (server cache; streaming updates merge into the same
cache); Tailwind consuming the `@seldon/ui` tokens; MapLibre GL JS with
the PMTiles protocol for all maps. Deployed as a Worker with static
assets — the Worker itself is a thin edge layer (asset serving, security
headers); all rendering is client-side against `@seldon/client`, the
*only* way Terminus talks to the system (no hand-rolled fetches — the
generated client is the contract, see [the API doc](11-api.md)). No SSR
in v1: the console sits behind Cloudflare Access, so there is no SEO
surface and the complexity buys nothing. Charts are hand-rolled SVG
components in `@seldon/ui` (hemicycle, fans, bars) — the visuals are
signature enough to own.

## Accessibility

Target: WCAG 2.2 AA, treated as an acceptance criterion, not a hope.

- **Keyboard-complete**: every workflow — including map browsing (arrow
  keys pan, +/- zoom, tab cycles visible households at street zoom) and
  the dossier panel (focus-trapped while open, Esc closes, focus returns
  to the triggering dot).
- **Colour is never the only channel**: party identification pairs colour
  with text labels and, in dense visuals, pattern fills on request; the
  low-confidence hatch is itself a non-colour channel.
- **Every chart has a table**: hemicycle, fans, and maps each expose a
  "view as table" toggle rendering the same data as an accessible HTML
  table — which doubles as the CSV export source.
- **Contrast**: the dark palette holds ≥ 4.5:1 for text and ≥ 3:1 for
  data marks; party colours get a hairline halo on `--void` where their
  own contrast falls short.
- **Live regions, calmly**: streaming run progress updates an
  `aria-live="polite"` summary at coarse milestones, not per tick.
- **Reduced motion** honoured as above; **zoom to 400%** reflows (panels
  stack, the map yields to the table view).

## Related

[Vision](01-vision.md) · [Lexicon](02-lexicon.md) ·
[Architecture](03-architecture.md) · [Population](04-population.md) ·
[Datasets](05-datasets.md) · [Scenarios](06-scenarios.md) ·
[Questions](07-questions.md) · [Engine](08-engine.md) ·
[API](11-api.md) · [Deployment](12-deployment.md)
