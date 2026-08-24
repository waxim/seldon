# Seldon

> A household-level UK election prediction system implementing **SHARP** — Synthetic Household Assumption-Resolved Prediction.

## Overview

Seldon is a UK general election prediction system that takes a fundamentally different approach to forecasting. Rather than polling aggregates or even MRP (Multilevel Regression with Poststratification), Seldon constructs a **synthetic household-level model of the entire UK electorate**, attaches demographic information to every modelled household, then resolves each household to a vote at run-time under a configurable set of assumptions.

Votes are tallied up to ward, constituency, region, and national level to produce both a seat allocation and a winner. Because every assumption is a knob, Seldon is fundamentally a **what-if engine** — flip an assumption (turnout among under-30s, swing in Red Wall seats, Reform-to-Conservative tactical voting, etc.) and re-run to get a fresh forecast.

### Methodology: SHARP

**SHARP** — *Synthetic Household Assumption-Resolved Prediction* — describes the approach:

1. **Synthetic** — households are constructed (not surveyed) from census, electoral register, and ONS demographic data.
2. **Household-level** — the unit of simulation is the household, not the individual or the constituency.
3. **Assumption-Resolved** — each household resolves to a vote only at run-time, conditioned on the current assumption set.
4. **Prediction** — outputs are seat counts, win probabilities, and full constituency-level results.

The codename for the system itself is **Seldon**, after Hari Seldon from Asimov's *Foundation* — the practitioner of psychohistory, the fictional science of predicting mass behaviour from statistical regularities of individuals.

## Architecture

Seldon is a **TypeScript monorepo** composed of two backend services, a CLI, and shared packages. The CLI is the operator-facing surface; everything else is plumbing it orchestrates.

```
┌─────────────────────────────────────────────────────────────┐
│                      seldon (CLI)                           │
│  - bootstrap, configure, run, compare, report               │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             │ orchestrates              │ orchestrates
             ▼                           ▼
   ┌──────────────────┐         ┌──────────────────┐
   │   psephos-api    │◄────────│   psephos-model  │
   │ (household data) │  reads  │  (SHARP engine)  │
   └────────┬─────────┘         └────────┬─────────┘
            │                            │
            ▼                            ▼
      ┌──────────┐                 ┌──────────┐
      │ Postgres │                 │   Runs   │
      │  + PostGIS│                │  Store   │
      └──────────┘                 └──────────┘
                    ▲
                    │
        ┌───────────┴───────────┐
        │   shared packages     │
        │ (types, schema, etc.) │
        └───────────────────────┘
```

### Components

#### `apps/seldon` — the CLI

The control plane. A Bun/TypeScript CLI (built with `commander`) that:

- Boots the stack (`seldon up`) and tears it down (`seldon down`).
- Manages source datasets — fetch, clean, and load (`seldon data <command>`).
- Synthesises the canonical electorate and forks/skews it for testing (`seldon synthesise`, `seldon electorate ...`).
- Defines, edits, and stores **assumption sets** (`seldon assumptions ...`).
- Triggers model runs against a chosen assumption set (`seldon run --assumptions <name>`).
- Runs a fully random simulation as a noise baseline (`seldon sim`).
- Backtests the engine against a known election (`seldon backtest`).
- Compares runs side-by-side (`seldon diff <run-a> <run-b>`).
- Renders results — a console summary and a full, self-contained HTML report with a Commons hemicycle, a constituency map (schematic SVG, plus Mapbox GL when a token is set), seat-forecast distributions, and regional breakdowns (`seldon report <run>`).
- Manages snapshots so a run is reproducible (data version + assumption hash + model version).

Seldon owns nothing of substance itself — it is the conductor.

#### `apps/psephos-api` — the household data service

The first of the two services. Responsible for **everything to do with the synthetic electorate**:

- Owns its own PostgreSQL database (with PostGIS for ward/constituency geometry).
- Owns its own schema and migrations (Drizzle).
- Ingests source datasets: ONS census, electoral register summaries, constituency boundaries, ward-level demographics, historical results, MRP outputs for calibration.
- **Synthesises households** — given ward-level demographic distributions, generates a population of synthetic households whose marginals match observed data (iterative proportional fitting / synthetic reconstruction).
- **Manages electorates** — the synthesised population is the *canon*; the API forks it into independent copies and *skews* those forks (inject a cohort, age the population, re-tenure households) to build a library of what-if electorates for testing.
- Exposes a typed REST API for querying households by electorate, ward, constituency, demographic slice, etc.
- Returns households as streamable batches — the model needs to consume millions of them.

This service is **pure data**. It knows nothing about voting, parties, or predictions. It answers questions like "give me every synthetic household in Wakefield with at least one voter aged 18-24."

#### `apps/psephos-model` — the SHARP engine

The second service, and the actual prediction engine. Its pipeline:

1. **Build the country.** A synthetic UK electorate — 650 constituencies, demographic profiles that vary by region and seat type, reference vote shares calibrated to the 2024 general election. It is generated in process (seeded, reproducible), so the engine runs without a live data service.
2. **Group into cells.** Voters who share a constituency and a demographic signature — sex, age, qualification, tenure, income — resolve identically, so they collapse into a *cell*. Tens of millions of voters become tens of thousands of cells, which is what makes a thousand-iteration run tractable.
3. **Compile the scenario.** An **assumption set** is collapsed into a runnable plan: national/regional swings fold into an adjusted per-constituency baseline; headwinds into a per-seat shift; every demographic rule's predicate is evaluated against every cell, and matching effects fold into a per-cell log-odds shift, a turnout delta, and tactical transfers.
4. **Run the Monte Carlo ensemble.** Each iteration draws fresh gaussian *jitter* (national, constituency and per-cell), resolves every cell to a vote distribution via a softmax, tallies seats, and applies first-past-the-post. The ensemble becomes a `RunResult` — point estimates **plus the distributions around them**: seat ranges, win probabilities, P(hung parliament).
5. **Backtest.** The engine hindcasts the 2024 election from a reconstructed 2019 prior and scores itself — call accuracy, seat error, Brier score — its honesty check.

The model is stateless between runs. State lives in the population (regenerated deterministically) and the run store (artefacts).

#### `packages/*` — shared packages

The monorepo glue.

- **`@seldon/types`** — shared TypeScript types: `Household`, `Person`, `Constituency`, `Ward`, `Party`, `AssumptionSet`, `Run`, `Result`. Single source of truth across CLI, API, and model.
- **`@seldon/schema`** — Zod (or similar) runtime schemas matching the types, used at API boundaries.
- **`@seldon/assumptions`** — the scenario vocabulary: assumption-set definitions, the predicate DSL, rule/effect builders, and a library of ready-made scenarios. Versioned and hashable, so a run's assumption set is reproducible.
- **`@seldon/parties`** — canonical party definitions, colours, aliases, historical mappings.
- **`@seldon/geo`** — constituency/ward identifiers, boundary helpers, region groupings (Red Wall, Blue Wall, Scotland, etc.).
- **`@seldon/client`** — typed client for `psephos-api`, consumed by both the model and the CLI.
- **`@seldon/config`** — shared config loading, env handling.
- **`@seldon/logger`** — shared structured logger.

## Repository Layout

```
seldon/
├── apps/
│   ├── seldon/           # CLI (the controller)
│   ├── psephos-api/      # household data service
│   └── psephos-model/    # SHARP prediction engine
├── packages/
│   ├── types/
│   ├── schema/
│   ├── assumptions/
│   ├── parties/
│   ├── geo/
│   ├── client/
│   ├── config/
│   └── logger/
├── data/                 # source definitions (sources/*.yaml); fetched data gitignored
├── docs/
├── package.json          # Bun workspaces + root scripts
├── turbo.json            # task graph + caching
├── biome.json            # lint + format
└── tsconfig.base.json
```

Tooling: **Bun** — runtime, package manager, test runner, and bundler — with **Turborepo** for task orchestration and caching, and **Biome** for lint/format. Bun runs TypeScript directly, so packages export `src/` with no build step; only the apps bundle (`bun build`).

## Getting Started

```bash
bun install                     # install workspace dependencies
cp .env.example .env             # then edit .env — set your Postgres URLs

bun run typecheck                # type-check every workspace
bun run test                     # run the test suites
bun run lint                     # Biome lint + format check
```

Seldon does not run a database for you. Install Postgres (a local install,
Postgres.app, or a hosted provider), create the two databases, and point
`.env` at them:

```bash
createdb psephos && createdb psephos_runs   # names are up to you — match .env

seldon up                        # connect to Postgres, enable PostGIS,
                                  # run migrations, start both services
seldon status                    # re-check the stack at any time
seldon down                      # stop the services
```

`seldon up` runs the two services as background Bun processes — no Docker.
If [portless](https://github.com/vercel-labs/portless) is installed it also
registers `https://psephos-api.localhost` / `https://psephos-model.localhost`.

## A Typical Run

The forecast engine runs **in process** — no Postgres, no services, no
`seldon up`. A run is just a CLI command:

```bash
# a scenario is a file — start from a preset, or the blank baseline
seldon assumptions new my-forecast --from reform-surge
seldon assumptions list

# run it — a Monte Carlo ensemble over the synthetic electorate
seldon run --assumptions my-forecast --iterations 1000 --seed 1 --report
# → Reform 415, Labour 159, Lib Dem 27, SNP 13, …  + a full HTML report

# inspect a run — console summary, regional and constituency detail
seldon report latest --level constituency

# flip an assumption and compare
seldon assumptions clone my-forecast my-forecast-hi
seldon assumptions set my-forecast-hi turnout.base=0.72
seldon run --assumptions my-forecast-hi
seldon diff my-forecast my-forecast-hi

# score the engine against a known election
seldon backtest --iterations 500 --html
```

### Scenarios & the assumption DSL

An **assumption set** is a layered description of a what-if. The empty set
reproduces the reference election; every field is a deliberate perturbation:

- **National / regional targets** — set `nationalShare.reform = 0.24` and the
  model swings every seat toward it.
- **Headwinds** — party-level momentum, optionally only where the party is the
  incumbent or the challenger.
- **Demographic rules** — the heart of SHARP. Each rule has a `when` predicate
  in a small DSL, evaluated against every voter's demographics and the facts of
  their seat, and an `effect` for the voters it matches:

  ```
  rule: "men over 50 without a degree on under £50k skew far-right"
  when:   sex == male && age > 50 && !degree && income < 50000
  effect: skew toward far-right, magnitude 1.4
  ```

  Predicates compose with `&&` / `||` / `!`, compare with `==`, `<`, `in`, and
  read fields like `region`, `tenure`, `marginal`, `incumbent`, `redWall`.
- **Tactical voting** — a slice of one party's vote switches to another, gated
  by its own predicate.
- **Jitter** — per-iteration gaussian noise on every layer, so a long Monte
  Carlo run explores the neighbourhood of a scenario, not a single point.

Built-in presets — `baseline-2026`, `reform-surge`, `youthquake`,
`progressive-alliance`, `blue-revival` — are worked examples; clone one with
`seldon assumptions new <name> --from <preset>`.

### Electorates — the canon and its forks

The synthesised population is the **canon**: one true reflection of the UK,
rebuilt whenever `seldon synthesise` runs. The canon is immutable — you never
edit it in place.

To trial a what-if population, **fork** the canon into an independent copy and
**skew** the fork with transforms:

```bash
seldon electorate fork canon youthquake --skew "add 10000 newly-18"
seldon electorate fork canon grey-britain --skew "age-shift 0.15"
seldon electorate skew youthquake "register 0.9 18-24"   # layer on more skews
seldon electorate list                                   # the canon + every fork
seldon electorate show youthquake                        # lineage, stats, transforms
```

A fork is the canon plus an ordered list of skew transforms, so its whole
lineage is reproducible. Skews cover `add`/`remove` cohorts, `age-shift`
(ageing the population a band at a time), `scale` an age band, `tenure` shifts,
and `register`-rate changes — each optionally scoped to named constituencies or
wards. Build as many forks as a test plan needs; the canon stays the fixed
point they are all measured against.

### Sim mode — the random baseline

`seldon sim` short-circuits the data and assumption pipeline entirely: it
generates a fully random synthetic electorate and resolves every vote
*utterly at random*, then reports the seat distribution over many iterations.

```bash
seldon sim --iterations 100 --seed 1
```

It runs in-process — no Docker, no Postgres, no services — so it doubles as a
fast end-to-end system test of the engine plumbing. Its real purpose is a
**noise floor**: uniform-random voting puts every party near the same mean
seat count, so a genuine forecast must sit many standard deviations away from
the sim baseline. If a real run lands near random noise, the model is off
track.

## Design Principles

- **Reproducibility over speed.** Every run is fully addressable by `(data_version, assumption_hash, model_version, seed)`. The same inputs always produce the same outputs.
- **Strict service boundaries.** The household API never knows about voting. The model never writes to the household DB. The CLI never reaches into either service's internals.
- **Typed end-to-end.** Shared types + runtime schemas mean a breaking change in `Household` fails type-checking across every consumer.
- **Assumptions are first-class.** They are versioned, diff-able, and stored alongside results. A claim like "Reform peels 8% of 2024 Conservative voters" is a line in an assumption file, not a hidden constant.
- **The CLI is the product.** Anyone running Seldon should never need to `curl` the API or read database rows. If a workflow can't be expressed as a `seldon` command, it's missing.

## Decisions & Open Questions

The headline architecture decisions have been made — full reasoning in
[`docs/decisions.md`](docs/decisions.md):

- **ORM:** Drizzle — SQL-forward, keeps raw control over PostGIS columns.
- **API protocol:** typed REST — Zod schemas at the boundary, portable for future non-TS consumers.
- **Run store:** Postgres — a second database (`psephos_runs`) owned by the model.
- **Tooling:** Bun + Turborepo.

Still open:

- **Model parallelism:** the engine groups voters into demographic cells and
  tallies expected votes, so a thousand-iteration national run finishes in
  tens of seconds single-threaded. Worker threads would still help for very
  large ensembles.
- **Synthesis strategy:** the in-process population is a seeded synthetic
  electorate calibrated to 2024 regional aggregates; wiring the engine to
  consume the IPF-synthesised canon from `psephos-api` is the next step.
- **Calibration:** `seldon backtest` hindcasts 2024 from a reconstructed 2019
  prior and scores the engine (call accuracy, seat error, Brier score). It is
  a methodology check today; calibrating against a library of real historical
  elections is the path to a trustworthy forecast.
