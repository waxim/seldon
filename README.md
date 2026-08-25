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

## Status: P0 — Streeling

The design in [`docs/`](docs/) is complete and remains the contract. The
monorepo now exists alongside it: seven Worker apps, six shared packages,
the Pulumi infrastructure project and the full CI/CD pipeline are
scaffolded and green. **No domain logic is built yet** — the apps answer
health, prove their bindings and hold their schemas.

Terminus, though, is designed out end to end: every section of the
information architecture is a routed screen wearing its real chrome — the
columns a table will have, the chamber a hemicycle will fill — and an
empty state that names the phase which fills it. Nothing invents a number
to cover the gap, and each phase fills its own screens as it lands. What
P0 delivers, and what still gates P1, is tracked in
[`docs/p0-acceptance.md`](docs/p0-acceptance.md).

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

## Working in the monorepo

```bash
bun install
bun run check              # typecheck + lint + test — the PR gate
bun run dev                # the whole stack locally (wrangler dev per app)
bun run build              # the Terminus SPA; everything else ships source
bun run deploy:dry-run     # bundle + validate every app, no account needed
```

Tests run **inside workerd** with Miniflare-simulated bindings, and each
service's D1 is booted from its own migration chain, so a broken migration
fails the pull request rather than the deploy.

Infrastructure is two layers with one seam
([`docs/12-deployment.md`](docs/12-deployment.md)):

```bash
bun run infra:up --env staging   # pulumi up, then sync stack outputs
bun run gen:wrangler             # regenerate wrangler.jsonc from the table
bun run infra:check              # fail on any drift between the two layers
bun run migrate --env staging    # D1 migration chains, before any deploy
bun run deploy --env staging     # ordered deploy
bun run smoke --env staging      # health-walk what was just deployed
```

Every app's `wrangler.jsonc` is generated from the single resource table in
`@seldon/foundation` (`RESOURCES`), so a binding, a physical resource name
and the Pulumi resource that backs it cannot drift apart unnoticed. Before
the first `pulumi up`, the generated configs carry `pulumi:` placeholder
ids and `config/environments.json` carries `.example` hostnames;
`infra:check --strict`, which the deploy workflow runs, refuses both.

## The monorepo

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
│   ├── dsl/                 # predicate DSL: typed field registry, lint
│   ├── parties/             # party registry
│   ├── geo/                 # geography codes, lookups, region lists
│   ├── client/              # typed API client over the route registry
│   └── ui/                  # Terminus design system
├── infra/                   # Pulumi (TypeScript): account-level resources
├── scripts/                 # deploy, migrate, preview, smoke, infra:check
├── config/                  # per-environment account facts; test stubs
├── data/                    # source manifests (committed)
├── docs/                    # this design
├── .github/workflows/       # ci.yml (PRs) · deploy.yml (staging, release)
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
