# Seldon

> *A living replica of a nation, and the machinery to ask it questions.*

Seldon is a population-simulation and prediction engine. It maintains a
**synthetic demographic replica of the entire UK population** — every
household, every adult, statistically faithful to published census data —
and uses that replica as the substrate for answering questions at voter
level, simulated across the whole population, with outcomes resolved
through configurable functions and openly disclosed caveats.

The flagship question:

> **"If a general election were held today, how would you vote?"**

— answered not by aggregating polls, but by resolving fifty million
synthetic adults, seat by seat, under an explicit scenario. But elections
are the flagship, not the limit: Seldon is a general question engine. Any
survey-style question can be framed, resolved against the replica, and
archived with its outcome.

The project is named for Hari Seldon of Asimov's *Foundation* — the
inventor of psychohistory, the fictional science of predicting mass
behaviour from the statistical regularities of individuals. The services
that make up the system carry names from the same universe.

## Status: design phase

**Nothing in this repository is built yet.** This repo currently contains
the complete design for Seldon v3 — the documents in [`docs/`](docs/) are
the contract the build will be held to. When construction starts, this
repository becomes the monorepo: application code, shared packages, and
all infrastructure code live here.

Two earlier attempts inform this design and are kept as history:
[`LEGACY.md`](LEGACY.md) (v1 — a CLI + services build) and [`v2/`](v2/)
(v2 — a local-first CLI redesign, never built). Their best ideas —
household synthesis by iterative proportional fitting, demographic cells,
the predicate DSL, the reproducibility tuple, the honesty culture — carry
forward. Their architecture does not: v3 is **not a CLI**. It is a set of
services on the Cloudflare Developer Platform, operated entirely through a
real website.

## The idea in five sentences

1. **Encyclopedia** ingests published data — census tables, election
   results, boundaries, deprivation indices, polling — through a fully
   automated, checksummed pipeline.
2. **Radiant** maintains the living replica: a canon population of ~28
   million synthetic households that advances in immutable epochs as new
   data lands, browsable down to a single house — click any household on
   the map and open its full dossier.
3. **Vault** holds the asking domain: scenarios (explicit, versioned
   what-if assumptions), questions (instruments, frames, resolvers,
   outcome functions, caveats), runs, and every outcome ever produced.
4. **Psychohistory** executes: it compiles a scenario and question against
   the replica's demographic cells and runs a correlated-shock Monte Carlo
   ensemble across 650 constituency shards in parallel.
5. **Second Foundation** keeps it honest: backtests against real
   elections, a null model the engine must beat, calibrated uncertainty,
   and a constant watch on data freshness and drift.

All of it surfaced through **Terminus**, the web console, behind
**Demerzel**, the gateway.

## The cast

| Service | Named for | Role |
| --- | --- | --- |
| **Terminus** | The Foundation's home world | The web console — browse the replica, manage datasets, scenarios, questions, runs, outcomes |
| **Demerzel** | The quiet hand behind the throne | API gateway — auth, routing, audit |
| **Radiant** | The Prime Radiant | The living population — worlds, epochs, forks, layers, dossiers |
| **Encyclopedia** | The Encyclopedia Galactica | Datasets — ingestion, catalogue, provenance |
| **Psychohistory** | The science itself | The simulation engine |
| **Vault** | The Time Vault | Scenarios, questions, runs, outcomes |
| **Second Foundation** | The hidden guardians | Calibration, backtests, drift watch |

Full naming scheme and domain vocabulary: [`docs/02-lexicon.md`](docs/02-lexicon.md).

## Platform

Seldon v3 is designed natively for the **Cloudflare Developer Platform**:
Workers for every service, Durable Objects (one SQLite-backed shard per
constituency) for the population and for run coordination, D1 for
relational metadata, R2 for bulk artefacts and map tiles, Queues and
Workflows for fan-out and durable orchestration, KV, Cron Triggers,
Analytics Engine, and Cloudflare Access for auth. **TypeScript
everywhere** — services, shared packages, the console, and the
infrastructure code itself.

Why this platform, and every other load-bearing choice, is argued in
[`docs/14-decisions.md`](docs/14-decisions.md).

## The documents

Read in order for the full picture, or jump to what you need:

| Doc | Contents |
| --- | --- |
| [01 · Vision](docs/01-vision.md) | What Seldon is, principles, lessons inherited from v1/v2 |
| [02 · Lexicon](docs/02-lexicon.md) | The Foundation naming scheme and canonical domain vocabulary |
| [03 · Architecture](docs/03-architecture.md) | Topology, services, platform mapping, the key flows |
| [04 · Population](docs/04-population.md) | Worlds, the canon, epochs, synthesis, layers, forks, the dossier |
| [05 · Datasets](docs/05-datasets.md) | Source manifests, the UK catalogue, ingestion, lineage |
| [06 · Scenarios](docs/06-scenarios.md) | The what-if model: rules, the DSL, Mule events, presets |
| [07 · Questions](docs/07-questions.md) | Instruments, frames, resolvers, outcome functions, caveats |
| [08 · Engine](docs/08-engine.md) | Cells, correlated shocks, Monte Carlo, determinism |
| [09 · Terminus](docs/09-terminus.md) | The website: every screen, the map, the design language |
| [10 · Data model](docs/10-data-model.md) | D1 schemas, shard SQLite, R2 layout, id conventions |
| [11 · API](docs/11-api.md) | The public surface, internal RPC, realtime, auth |
| [12 · Deployment](docs/12-deployment.md) | Monorepo tooling, IaC, environments, CI/CD, rollout |
| [13 · Roadmap](docs/13-roadmap.md) | Build phases P0–P5 with acceptance criteria |
| [14 · Decisions](docs/14-decisions.md) | The ADR ledger — why it is the way it is |

## The monorepo (as designed)

```
seldon/
├── apps/
│   ├── terminus/            # the console (Worker + static assets, React SPA)
│   ├── demerzel/            # gateway: auth, routing, audit
│   ├── radiant/             # population: worlds, epochs, forks, layers, shards
│   ├── encyclopedia/        # datasets: manifests, ingestion, catalogue
│   ├── psychohistory/       # engine: coordinators, compute, shocks
│   ├── vault/               # scenarios, questions, runs, outcomes
│   └── second-foundation/   # calibration, backtests, drift, schedules
├── packages/
│   ├── foundation/          # shared core: types, schemas, ids, errors
│   ├── dsl/                 # predicate DSL: parser, registry, evaluator
│   ├── parties/             # party registry
│   ├── geo/                 # geography codes, lookups, region lists
│   ├── client/              # typed API client (generated)
│   └── ui/                  # Terminus design system
├── infra/                   # Pulumi (TypeScript): account-level resources
├── data/                    # source manifests (committed)
├── docs/                    # this design
├── v2/ · LEGACY.md          # history, kept
├── package.json             # Bun workspaces
├── turbo.json               # task graph
└── biome.json               # lint + format
```

## A note on the people who don't exist

Every household and every person in Seldon is **synthetic**. The replica
matches published aggregate statistics; it is never linked to electoral
registers or any person-level real data, and no real individual is
modelled or identifiable. Map locations are plausible, density-weighted
placements — never real addresses. The full privacy stance is part of the
population design: [`docs/04-population.md`](docs/04-population.md).
