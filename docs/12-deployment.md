# Deployment

*A thousand-year plan still ships one small, reversible change at a time.*

This document owns how Seldon v3 gets from a clean clone to production: the
monorepo toolchain, the two-layer infrastructure-as-code split between
per-app `wrangler.jsonc` files and account-level Pulumi TypeScript in
`infra/`, the three environments and their resource-naming rules, the GitHub
Actions pipelines, secrets handling, migration discipline for D1 and Durable
Objects, gradual rollout and rollback, observability, and the cost posture.
Service design lives in [03-architecture](03-architecture.md); storage
schemas in [10-data-model](10-data-model.md). Nothing described here is
built yet — this is the deployment design that the phases in
[13-roadmap](13-roadmap.md) will implement, starting at P0.

## Monorepo tooling

The repository is a Bun-workspaces monorepo (tree in
[03-architecture](03-architecture.md)). One toolchain, root-configured:

| Tool | Role |
| --- | --- |
| **Bun** | Package manager (workspaces) and runtime for repo tooling and scripts. Workers run on workerd in production — Bun is the toolchain, never the production runtime. |
| **Turborepo** | Task graph and caching: `typecheck`, `lint`, `test`, `build`, `deploy` run in correct dependency order across `apps/` and `packages/`, cached by content hash. |
| **Biome** | Lint and format, one `biome.json` at the root. No per-package variation. |
| **Vitest + `@cloudflare/vitest-pool-workers`** | Tests execute *inside workerd*, with Miniflare-simulated bindings — DO, D1, R2, KV and Queues behave like production, not like mocks. |
| **Wrangler** | One `wrangler.jsonc` per app; owns everything Worker-attached (see the IaC split below). |
| **TypeScript project references** | A `tsconfig.json` per package and app, referencing dependencies, so typechecking is incremental and import boundaries are real. |

Packages export TypeScript source directly — Wrangler's bundler compiles
each app at deploy time. Terminus alone has a real build step (Vite,
producing the static assets the Worker serves).

Root scripts (thin wrappers over `turbo run`):

```
bun run check         # typecheck + lint + test — the PR gate
bun run dev           # wrangler dev per app; local registry wires bindings
bun run preview       # wrangler versions upload per app (CI, per PR)
bun run deploy        # wrangler deploy per app, dependency-ordered (CI)
bun run migrate       # d1 migrations apply, per service, per env (CI)
bun run infra:up      # pulumi up in infra/ for the selected stack
bun run infra:check   # assert wrangler.jsonc matches Pulumi outputs
bun run smoke         # health-walk a deployed environment
```

## Environments

| Env | Where | Resources | Purpose |
| --- | --- | --- | --- |
| `dev` | Each developer's machine: `wrangler dev` + Miniflare | Simulated locally; no Cloudflare resources | Daily work; full-stack local via the dev registry |
| `staging` | Cloudflare account | Real, `-staging` suffixed; Pulumi stack `staging` | Continuous deploy from `main`; soak before release |
| `production` | Cloudflare account | Real, `-production` suffixed; Pulumi stack `production` | Released versions only, gradual rollout |

`bun run dev` starts `wrangler dev` for every app; Wrangler's local dev
registry connects service bindings between concurrently running sessions,
and Miniflare simulates DO, D1, R2, KV, Queues and Workflows. Cloudflare
Access is not in the local path — Demerzel substitutes a stub identity in
`dev` only (auth internals in [11-api](11-api.md)).

**Naming rules** (the one convention, applied everywhere):

- Workers: `seldon-<service>-<env>` — e.g. `seldon-radiant-staging`.
- D1: `seldon-<service>-db-<env>` — e.g. `seldon-vault-db-production`.
- R2: `seldon-<purpose>-<env>` — e.g. `seldon-epochs-staging` (canonical
  bucket set in [10-data-model](10-data-model.md)).
- Queues: `seldon-<purpose>-<env>`, DLQs `seldon-<purpose>-dlq-<env>`.
- KV: `seldon-<purpose>-kv-<env>`.
- **Binding names never carry the environment.** Code sees `RADIANT_DB`,
  `EPOCH_BUCKET`, `SIM_TASKS_QUEUE` in every env; only configuration maps a
  binding to an env-specific resource. Bindings are SCREAMING_SNAKE and
  service- or purpose-prefixed per [10-data-model](10-data-model.md).

Production is suffixed like everything else — no "bare name means prod"
ambiguity, and a mispasted id fails loudly rather than silently crossing
environments.

## Two-layer IaC

The split rule: **anything that holds data or grants access outlives any
deploy and belongs to Pulumi; anything that is an attribute of a Worker
deploy belongs to wrangler.**

| Layer | Owns |
| --- | --- |
| `wrangler.jsonc` (per app, versioned with the code it configures) | Worker script + bundling, compatibility dates/flags, DO classes and their migrations, all bindings (D1, R2, KV, queue producers, service bindings, Workflows, Analytics Engine datasets), queue consumer attachment, cron triggers, routes, static assets (Terminus), observability settings |
| `infra/` (Pulumi TypeScript, account-level, changes rarely) | R2 buckets, D1 databases, Queues + DLQs, KV namespaces, DNS records, Cloudflare Access applications + policies + the CI service token |

The honest tradeoff: one tool for everything would be simpler, but Workers
versioning, gradual deployments and DO migrations are first-class only in
wrangler, while buckets and Access policies deserve reviewed, stateful IaC
rather than deploy-time side effects. Pulumi over Terraform is the
TypeScript-everywhere decision ([D6](14-decisions.md)); the Terraform
Cloudflare provider is the noted fallback if Pulumi's provider lags. The
seam between the layers is policed by `bun run infra:check`, which compares
Pulumi stack outputs (database ids, queue names, bucket names) against every
app's `wrangler.jsonc` env blocks and fails CI on drift.

## Anatomy of a `wrangler.jsonc` — Radiant

Radiant exercises nearly every binding type, so it is the worked example.
Terminus differs by adding an `assets` block; Demerzel alone carries public
routes; Second Foundation adds `triggers.crons`.

```jsonc
// apps/radiant/wrangler.jsonc — the population service.
// Top level is the local dev target; env blocks carry the real ids.
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "seldon-radiant-dev",
  "main": "src/index.ts",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],

  // Workers Logs. Full sampling until real volume says otherwise.
  "observability": { "enabled": true, "head_sampling_rate": 1 },

  // Non-secret configuration only. Secrets never appear here.
  "vars": { "ENVIRONMENT": "dev" },

  // ── Durable Objects ──────────────────────────────────────────────
  // SeatShard: one object per (world, constituency) — ~650 for the UK.
  // WorldRegistry: one object per world.
  "durable_objects": {
    "bindings": [
      { "name": "SEAT_SHARD", "class_name": "SeatShard" },
      { "name": "WORLD_REGISTRY", "class_name": "WorldRegistry" }
    ]
  },
  // DO migrations: append-only deploy events (§ Migration discipline).
  // new_sqlite_classes ⇒ SQLite-backed storage — mandatory for shards.
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["SeatShard", "WorldRegistry"] }
  ],

  // ── Relational metadata: worlds, epochs, forks, layers ───────────
  // database_id is a placeholder locally; real ids are Pulumi outputs.
  "d1_databases": [
    {
      "binding": "RADIANT_DB",
      "database_name": "seldon-radiant-db-dev",
      "database_id": "local"
    }
  ],

  // ── Bulk artefacts: epoch snapshots (Parquet, per-seat) ──────────
  "r2_buckets": [
    { "binding": "EPOCH_BUCKET", "bucket_name": "seldon-epochs-dev" }
  ],

  // ── Hot caches: tile manifests, aggregate summaries ──────────────
  "kv_namespaces": [{ "binding": "RADIANT_CACHE_KV", "id": "local" }],

  // ── Synthesis fan-out: Radiant enqueues and consumes seat tasks ──
  "queues": {
    "producers": [
      { "binding": "SYNTH_TASKS_QUEUE", "queue": "seldon-synth-tasks-dev" }
    ],
    "consumers": [
      {
        "queue": "seldon-synth-tasks-dev",
        "max_batch_size": 1,            // one seat per invocation
        "max_retries": 3,
        "dead_letter_queue": "seldon-synth-tasks-dlq-dev"
      }
    ]
  },

  // ── Durable orchestration: derive → IPF → validate → publish ─────
  "workflows": [
    {
      "binding": "SYNTHESIS_WORKFLOW",
      "name": "seldon-synthesis-dev",
      "class_name": "SynthesisWorkflow"
    }
  ],

  // ── Internal RPC. This Worker has no public routes at all. ───────
  "services": [{ "binding": "VAULT", "service": "seldon-vault-dev" }],

  // ── Real environments. Bindings are non-inheritable in wrangler, ─
  // so each env restates them with env-suffixed names and real ids —
  // verbose, but explicit, and infra:check keeps it honest.
  "env": {
    "staging": {
      "name": "seldon-radiant-staging",
      "vars": { "ENVIRONMENT": "staging" },
      "d1_databases": [
        {
          "binding": "RADIANT_DB",
          "database_name": "seldon-radiant-db-staging",
          "database_id": "<from pulumi stack output: staging>"
        }
      ]
      // … r2, kv, queues, workflows, services likewise.
    },
    "production": {
      "name": "seldon-radiant-production"
      // … identical shape, -production names and ids.
    }
  }
}
```

## `infra/` — Pulumi TypeScript

```
infra/
├── Pulumi.yaml               # project definition (runtime: nodejs, TS)
├── Pulumi.staging.yaml       # stack config: account id, zone, team list
├── Pulumi.production.yaml
├── index.ts                  # composes the modules; exports outputs
├── src/
│   ├── naming.ts             # the one naming rule, in code
│   ├── buckets.ts            # R2 buckets (canonical set: 10-data-model)
│   ├── databases.ts          # D1 per service
│   ├── queues.ts             # queues + their DLQs
│   ├── kv.ts                 # KV namespaces
│   ├── access.ts             # Access apps, policies, CI service token
│   └── dns.ts                # records for the Terminus + API hostnames
└── package.json
```

```ts
// infra/src/naming.ts
import * as pulumi from "@pulumi/pulumi";

export const env = pulumi.getStack(); // "staging" | "production"
export const name = (base: string) => `seldon-${base}-${env}`;
```

```ts
// infra/src/databases.ts
import * as cloudflare from "@pulumi/cloudflare";
import { accountId } from "./config";
import { name } from "./naming";

const services = ["radiant", "vault", "encyclopedia", "demerzel"] as const;

export const databases = new Map(
  services.map((svc) => [
    svc,
    new cloudflare.D1Database(name(`${svc}-db`), {
      accountId,
      name: name(`${svc}-db`),
    }),
  ]),
);
```

`index.ts` exports every resource id and name as stack outputs; those
outputs are the contract `bun run infra:check` enforces against the
`wrangler.jsonc` env blocks.

Pulumi state lives in a dedicated R2 bucket via the S3-compatible backend,
encrypted with a stack passphrase — everything stays on Cloudflare. The
state bucket itself is the single hand-made resource (a documented, one-off
bootstrap step); Pulumi Cloud is the noted alternative if self-managed
state ever grates.

## CI/CD — GitHub Actions

Two workflows. Pull requests verify and preview; `main` deploys to staging
continuously; a published release deploys to production behind a manual
gate.

```yaml
# .github/workflows/ci.yml — every pull request
name: ci
on: pull_request

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      # One cached task graph: typecheck + lint + test (in workerd).
      - run: bun run check
      # wrangler.jsonc ids must match Pulumi stack outputs.
      - run: bun run infra:check

  preview:
    needs: verify
    runs-on: ubuntu-latest
    environment: staging        # scoped token; previews use staging data
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      # Upload a version per app WITHOUT deploying it: wrangler mints a
      # preview URL per version; a bot comment posts them on the PR.
      - run: bun run preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

```yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push:
    branches: [main]            # → staging, continuously
  release:
    types: [published]          # → production, behind a review gate

jobs:
  staging:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run infra:up --stack staging     # pulumi up, idempotent
      - run: bun run migrate --env staging        # D1, before any Worker
      # Leaves deploy first so service bindings always resolve:
      # radiant, vault, encyclopedia, psychohistory, second-foundation,
      # then demerzel, then terminus. Turborepo's graph encodes it.
      - run: bun run deploy --env staging
      - run: bun run smoke --env staging          # health walk (below)

  production:
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    environment: production     # required reviewers gate this job
    steps:
      # …same shape as staging, then:
      - run: bun run deploy --env production --gradual   # § Rollout
      - run: bun run smoke --env production
```

Releases are cut from a `main` commit that staging has already been running
— production never receives a SHA staging has not soaked. The smoke script
walks `GET /healthz` (shallow) and `GET /healthz/deep` (each service's RPC
health via Demerzel) using the CI Access service token from `infra/`.

## Secrets

Two planes, neither in the repo:

- **Deploy-time** — GitHub *environment* secrets, one set per env:
  `CLOUDFLARE_API_TOKEN` (least-privilege, per-env token),
  `CLOUDFLARE_ACCOUNT_ID`, `PULUMI_PASSPHRASE`, R2 state credentials.
- **Runtime** — `wrangler secret put NAME --env <env>`, per app. By design
  there are few: service bindings need no credentials, and Access JWT
  validation uses public keys. Expected set: the smoke-test Access service
  token (validated by Demerzel) and any per-source credentials Encyclopedia
  might one day need for a gated Tier 3 source.

Local dev reads `.dev.vars` (gitignored; `.dev.vars.example` committed).
Secrets never appear in `vars`, in Pulumi config plaintext (stack secrets
are passphrase-encrypted), or in CI logs.

## Migration discipline

### D1

Each service carries its own migrations directory, e.g.
`apps/vault/migrations/0001_init.sql`, `0002_add_outcome_caveats.sql`.
Applied by `wrangler d1 migrations apply` in the deploy job, before any
Worker deploys. Rules:

- Append-only; an applied migration is never edited.
- **Expand/contract**: additive change first, code moves over, destructive
  cleanup in a later release — so version N of the schema always supports
  version N−1 of the code, which is what makes rollback safe.
- CI boots every service's D1 from its migration chain inside
  vitest-pool-workers, so a broken migration fails the PR, not the deploy.

### Durable Objects

Two distinct mechanisms:

- **Class-level** — the `migrations` array in `wrangler.jsonc`: append-only
  tags for `new_sqlite_classes`, renames, deletions. These are deliberate
  deploy events; wrangler refuses to split traffic on a version containing
  one (see Rollout), so they ship at 100% after a staging soak.
- **In-object schema** — each DO runs a code-driven, idempotent migration
  ladder on construction, keyed on a stored schema version
  (`PRAGMA user_version` style). It ships with the Worker version, so the
  ~650 shards upgrade lazily on first touch — no fleet-wide stop-the-world.

Epoch data is immutable by design ([04-population](04-population.md)), so
most shard schema evolution rides the *next* epoch's fresh tables rather
than altering shipped ones. When a backfill is unavoidable it runs as a
Workflow fan-out across shards — an orchestrated job with retries and a
progress trail, never a deploy-time side effect.

## Rollout and rollback

Staging deploys are plain `wrangler deploy`. Production uses **gradual
deployments**:

1. `wrangler versions upload` publishes the new version, undeployed.
2. `wrangler versions deploy new@10% old@90%` starts the canary; the deploy
   script holds a soak window watching error rates (Workers Logs) and
   re-running smoke against the new version.
3. Promote to 100%, or abort back to `old@100%` — both are one command and
   take effect in seconds.

Constraints, stated honestly: versions containing DO class migrations
cannot be split and deploy at 100% — the mitigation is the staging soak
plus scheduling them deliberately. During a split, Durable Objects and
in-flight Workflows each run a single version consistently; queue consumers
may briefly span versions, so task payloads are versioned schemas
([10-data-model](10-data-model.md)).

Rollback is `wrangler rollback` to the previous version, and it is safe
*because* of the migration rules above: schemas are always one version more
permissive than the code that reads them. D1 and DO schemas are never
rolled back — only code is.

## Observability

- **Workers Logs** on for every app (`observability` block), fed by one
  structured JSON logger in `@seldon/foundation`; Demerzel assigns a
  request id propagated over RPC, correlating gateway audit rows
  ([11-api](11-api.md)) with per-service logs.
- **Analytics Engine** datasets for operational telemetry: run timings,
  shard health, ingestion stats, per-run compute cost. Charted in the
  Second Foundation screens of Terminus and the Cloudflare dashboard.
- **Alerts**: Cloudflare notifications on Worker error rates and DLQ depth;
  domain-level freshness and drift alerting belongs to Second Foundation.
- **Tail workers**: supported, off by default; attached ad hoc when hunting
  a live issue.

## Cost posture

Workers Paid plan, one account, order-of-magnitude only (no fake
precision):

- **DO storage** — ~650 shards × tens of MB ≈ 20–40 GB of SQLite: single
  digits of dollars per month, plus bursty request/duration charges
  dominated by epoch synthesis and Monte Carlo runs — both cell-bounded by
  design ([08-engine](08-engine.md)), so tens of dollars per month at a
  few runs per day.
- **R2** — epoch snapshots are single-digit GB each; retaining recent plus
  quarterly epochs is tens of GB: single digits per month. Zero egress is
  the reason map tiles live here.
- **D1, KV, Queues, Workflows** — minor at this scale.

Expected total: tens of dollars per month, not hundreds. The first real
epoch synthesis (P2) and the first sustained run load (P3) produce actual
telemetry; those roadmap gates include recording measured cost against
this estimate. Guardrails: the coordinator caps in-flight fan-out, DLQs
stop retry storms, and Analytics Engine makes per-run cost visible before
the invoice does.

Related: [03-architecture](03-architecture.md) ·
[10-data-model](10-data-model.md) · [11-api](11-api.md) ·
[13-roadmap](13-roadmap.md) · [14-decisions](14-decisions.md)
