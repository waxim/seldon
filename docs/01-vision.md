# Vision

*One person is a mystery; sixty-seven million are a curve.*

Seldon is a population-simulation and prediction engine. It maintains a
living synthetic replica of the UK population — demographically faithful at
household and individual level — and uses that replica as the substrate for
answering questions at voter level, simulated across the entire population,
with outcomes resolved through configurable functions and disclosed caveats.
The flagship question is *"If a general election were held today, how would
you vote?"*, but the machine is a general question engine: any survey-style
question can be asked of the replica. This document says what Seldon is, the
principles it is built on, the honest lessons carried from two previous
attempts, who it is for, and what "done" means for the design phase.

## What Seldon is

Three ideas, stacked:

1. **A living replica.** Seldon always maintains a synthetic copy of the UK
   population: ~28 million households, ~50 million adults, every one of them
   synthesised from published census marginals so the whole is statistically
   faithful to the real country. The replica is continuously refreshed as new
   data is published, and it is *browsable*: at any time you can open a map,
   click a house, and see rich, provenance-stamped information about the
   household behind the door. The architecture is built for more populations
   (countries) later — the UK is the first [world](04-population.md).

2. **A question engine.** Questions are first-class objects, not features.
   A question carries its own text, its answer instrument, a frame defining
   who is asked, a resolver mapping people to answer probabilities, outcome
   functions turning answers into results, and declared caveats. Elections
   are the flagship application — the standing general-election question is
   pinned to the console's front page — but the same machinery answers "do
   you support the winter fuel payment cut?" or "how would you rate your
   local NHS services?" against the same replica. See
   [questions](07-questions.md).

3. **A what-if machine, twice over.** *Scenarios* perturb behaviour — swing,
   headwinds, demographic rules, shocks — without touching the population.
   *Forks* perturb the population itself — add a cohort, age it, change
   registration rates — without touching behaviour. The two compose: any
   question can be asked of any population under any scenario. See
   [scenarios](06-scenarios.md) and [the population design](04-population.md).

Seldon runs entirely on the Cloudflare Developer Platform and is operated
through a real web console, not a CLI. The service topology, platform
mapping, and the reasoning behind them live in
[architecture](03-architecture.md); the naming scheme lives in the
[lexicon](02-lexicon.md).

## Principles

### 1. The replica lives

The population is not a dataset you regenerate when you remember to. It is
the canon: one continuously maintained replica per world, advancing by
immutable epochs as new source data lands, watched for staleness, refreshed
on cadence, always ready to be asked. Everything else in the system exists
to feed it, question it, or keep it honest.

### 2. Questions are first-class

A question is a versioned, reviewable artefact with an explicit frame ("who
is asked"), an explicit instrument ("what the answer options are"), an
explicit resolver ("how a synthetic person answers"), and explicit outcome
functions ("how answers become results"). Nothing about how a prediction is
produced hides in code paths; it is all declared, versioned, and inspectable
in the console.

### 3. Honesty over impressiveness

The most important lesson from v1 (below). Concretely:

- Every outcome lists its **caveats** — turnout weighting, don't-know
  reallocation, shy-response correction — as declared, versioned adjustments.
  No silent thumbs on the scale.
- The engine is **backtested against real elections** and must beat a
  uniform national swing null model to be worth its complexity. The score is
  printed, not hidden.
- Uncertainty is **calibrated**: intervals come from correlated demographic
  shocks fitted so that reality lands inside them at the stated rate — not
  from hand-set jitter constants that average out to nothing.
- **Real data or clearly-labelled fixture.** The prediction path runs only
  on ingested, checksummed, versioned datasets. Fixtures exist for tests and
  are impossible to mistake for the real thing.

### 4. Reproducible by address

Every run is fully addressed by the tuple
`(worldId, epochOrForkId, scenarioHash, questionVersion, engineVersion,
referenceDate, seed)`. The same tuple always reproduces the same result,
regardless of parallelism, scheduling, or the day it is re-run — anything
time-dependent is pinned to the tuple's reference date. Determinism is a
CI-grade contract, not an aspiration — see [the engine](08-engine.md).

### 5. Synthetic-only, and proudly so

Households and people in Seldon are **synthetic**. The replica matches
published aggregate marginals; it never links to electoral registers or any
person-level real data; no real individual is modelled or identifiable. Map
placement of households is plausible — density-weighted within small areas —
never a real address match. This is both an ethical line and the honest
framing of what fidelity means: the replica is statistically
indistinguishable from the UK *at the published level of detail*, and
claims nothing finer. The full treatment is in
[the population design](04-population.md).

### 6. Design first

This repository ships the design before any code. The docs in this
directory are the contract the build phase is held to; the repo itself is
the future monorepo, so the design includes the monorepo layout, the
deployment story, and infrastructure-as-code from day one. Nothing in these
documents pretends to exist: present tense describes the design, and
implementation specifics are explicitly framed as "when built".

## Lessons from two attempts

Seldon v3 is the third iteration. The previous two live in this repo as
history — [`LEGACY.md`](../LEGACY.md) for v1, [`v2/`](../v2/) for the v2
design — and are worth reading for the full story. The short, honest
version:

### v1: a green build around a hollow middle

v1 was built, and it looked finished: typecheck green, all tests passing,
`seldon run` printing a convincing forecast with a 93% backtest score. The
audit ([`v2/01-audit.md`](../v2/01-audit.md)) found that the forecast was
computed over 650 *fictional* constituencies procedurally generated from
hardcoded constants; the data pipeline's load stage was a `501 not
implemented` stub end to end; the household synthesis service could never
run because nothing wrote its input table; and the model never called the
household API at all. The backtest scored the model against data its own
generator had invented. The two halves of the system — data and model —
never touched.

What v1 taught us, at a price:

- **A passing test suite proves internal consistency, not truth.** v1's
  tests passed because they tested the fabricated world's own coherence.
  Hence principle 3: backtests against *real* elections, a null model to
  beat, and "real data or clearly-labelled fixture" as a hard rule.
- **Integration is the product.** Every v1 subsystem was individually
  plausible; the system was hollow because nothing forced the halves to
  meet. The v3 roadmap ([roadmap](13-roadmap.md)) makes each phase's
  acceptance criteria an end-to-end demonstration, not a unit milestone.
- **Silent failure is the enemy.** v1's DSL compiled field-name typos into
  predicates that matched nobody; unprocessable spreadsheets "succeeded" as
  binary blobs. v3's DSL has a typed field registry — unknown field, compile
  error — and ingestion fails loudly against declared expectations.
- **Good ideas survive bad wiring.** The IPF synthesiser, the cell trick,
  the predicate DSL, the scenario compiler's statistics, the declarative
  source registry, and the fork/skew engine were all genuinely good. v3
  carries all of them forward — as concepts, freshly designed for the new
  platform.

### v2: the right principles, the wrong container

v2 was designed, never built ([`v2/02-vision.md`](../v2/02-vision.md)). It
got the culture right — reproducibility as the run store's primary key, the
backtest as a CI gatekeeper, calibrated uncertainty, "nothing manual" data
ingestion with explicit escape hatches — and v3 keeps every one of those
commitments. But v2 doubled down on the CLI as the product and a
single-process engine over local files, which caps the system at one
operator, one machine, one moment. A living replica you can browse, share,
and question continuously wants to be a service with a real interface, not
a batch job with a report flag.

v3 therefore discards: the CLI as product, local files and DuckDB as the
runtime, Postgres/PostGIS, the v1 three-service topology, and the v2
single-process design. What replaces them is the subject of
[architecture](03-architecture.md).

## Who it is for

Today: the owner and a small circle of collaborators — a serious hobby
psephology lab with a public-grade front door. That scope shapes the design:
authentication is a small-team access policy rather than a user database,
and there are no external API stability promises yet. But the design is
deliberately org-ready — auth, auditing, and multi-world abstractions are
built so that a larger team, or a second country, is a configuration change
rather than a rewrite. The console is built to the standard of a real
product because reading it *is* the product: if the standing forecast, the
map, and the dossier are not genuinely pleasant to use, the system has
failed at its main job.

## Definition of done — for the design phase

This phase ships documents, not code. It is done when:

1. All fourteen design docs exist, follow the shared conventions, and
   cross-link correctly — a reader can start anywhere and reach everything.
2. A strong engineer who has never seen this repo could review the entire
   design — and estimate the build — from these docs alone.
3. Every owner requirement (living replica; click-a-house; Cloudflare-only;
   real website; themed naming; monorepo + IaC specified; TypeScript
   everywhere) traces to a specific doc section.
4. The monorepo layout, environment story, and infrastructure-as-code
   approach are specified precisely enough that P0 of the
   [roadmap](13-roadmap.md) can begin without further design work.
5. Every phase P0–P5 has concrete acceptance criteria, and every headline
   decision is recorded with its tradeoffs in the
   [decisions ledger](14-decisions.md).
6. No document pretends anything is built. Legacy is referenced as history;
   open questions are recorded where they live, not hidden.

Related: [lexicon](02-lexicon.md) · [architecture](03-architecture.md) ·
[population](04-population.md) · [questions](07-questions.md) ·
[roadmap](13-roadmap.md) · [decisions](14-decisions.md)
