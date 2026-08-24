# Data model

*Every prediction is only as durable as the ledger it is written in.*

This document owns Seldon's storage design: the rule that decides where
any piece of state lives, the id formats everything is addressed by, D1
schema sketches for the [Vault](07-questions.md),
[Encyclopedia](05-datasets.md), [Radiant](04-population.md) registry and
[Demerzel](11-api.md) audit log, the per-seat shard's Durable Object
SQLite schema, R2 bucket and key conventions, the Iceberg / R2 SQL
analytics plane, KV namespaces, and binding naming. API routes over this
data belong to [11-api.md](11-api.md); per-environment provisioning to
[12-deployment.md](12-deployment.md).

## The split rule

One sentence, applied everywhere:

> Relational metadata goes to **D1**; population rows and anything read at
> simulation speed go to **DO SQLite**; bulk immutable artefacts and
> analytics go to **R2** (registered as Iceberg for R2 SQL); caches go to
> **KV**.

| Store | Holds | Because |
| --- | --- | --- |
| D1 (per service) | Worlds, epochs, forks, layers; catalogue + locks; scenarios, questions, runs, outcomes; audit log | Small, relational, queryable from any Worker; one database per owning service |
| DO SQLite (per seat × epoch shard) | Households, persons, cells, fork deltas, standing-run leanings | Data locality: the compute that reads these rows runs in the same object ([08-engine](08-engine.md)) |
| R2 | Raw fetches, staged Parquet, epoch snapshots, run artefacts, PMTiles, exports, lock history | Immutable, bulky, zero egress; the archival truth D1 and DOs can be rebuilt from |
| KV | Poll-of-polls, compiled plans, hot aggregates, tile manifests, flags | Read-mostly, eventually consistent, cheap at the edge |

The corollaries matter as much as the rule: **no population rows in D1**
(43k households × 650 seats is a DO problem —
[14-decisions](14-decisions.md) D2/D3), **no queryable truth only in
KV** (caches are always reconstructible), and **every D1 row of
consequence has an R2 artefact behind it** (headline in D1, full
distributions in R2).

## Id formats

Ids live in `@seldon/foundation` as branded types with runtime validators,
so a `ForkId` cannot be passed where an `EpochId` is expected, and a
malformed id fails at the Demerzel boundary, not three services deep:

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
export type EpochId = Brand<string, "EpochId">;   // "ep_" + 12 hex
export const EpochId = { parse(s: string): EpochId { /* zod refine */ } };
```

Four id families, chosen by what the id must do:

| Shape | Family | Example | Used for |
| --- | --- | --- | --- |
| `ep_` `fk_` `dv_` `sc_` `pl_` + 12 hex | Content hash | `ep_5f9c2a1d44e0` | Epochs, forks, data versions, scenario hashes, compiled plans |
| `run_` `out_` `ing_` `aud_` + ULID | Time-sortable | `run_01j9dq3zx8k7` | Runs, outcomes, ingestion runs, audit entries |
| `world:seat:kind:local` | World-scoped composite | `uk:E14001156:hh:00b3c1` | Households (`hh`), persons (`p`), cells (`cell`) |
| `slug@version` | Authored document | `general-election-today@4`, `income@2` | Questions, layers, caveats, resolvers |

**Content-hash ids** are the first 12 hex chars (48 bits) of sha256 over
the thing's defining inputs — `ep_` over `(worldId,
populationDataVersion, synthConfig, seed)`
([04-population](04-population.md)), `sc_` over the scenario document
minus cosmetic fields ([06-scenarios](06-scenarios.md)). Same inputs,
same id: these ids *are* the reproducibility contract. 48 bits is
comfortable at thousands of epochs, not billions; the full hash is kept
in the owning row.

**Time-sortable ids** are ULIDs (lowercase Crockford base32) behind a
type prefix. Creation order becomes lexicographic order — `ORDER BY
run_id DESC` is "latest first" with no timestamp index — and D1 b-tree
inserts stay append-mostly.

**World-scoped composite ids** encode routing. `uk:E14001156:p:01a2f0`
reads: world `uk`, seat `E14001156` (ONS GSS codes — `E14`/`W07`/`S14`/
`N05` prefixes), kind, local hex id within the shard. Shard DOs are
epoch-keyed: the object holding a row is addressed as
`idFromName("uk:E14001156:ep_5f9c2a1d44e0")` — **the id plus the epoch
in view locates the row's Durable Object** — so no shard directory
table exists anywhere. Nothing crosses worlds. Dense views may
abbreviate `cell:042` to `c042`; the canonical form is the long one.
**Authored ids** (`slug@version`) name human-versioned documents where
identity is "which revision", not "which bytes".

## D1 schemas (DDL sketches)

One database per owning service, migrations in that service's directory
([12-deployment](12-deployment.md)). D1 is SQLite: `TEXT` ISO-8601 UTC
timestamps, JSON as `TEXT` (Zod-checked at the boundary). Sketches show
intent, not final migrations; every id is world-scoped.

### Radiant registry — `RADIANT_DB`

```sql
CREATE TABLE worlds (
  world_id TEXT PRIMARY KEY,       -- 'uk'
  name TEXT NOT NULL,
  config TEXT NOT NULL,            -- JSON: admin levels L1..L4, parties,
  created_at TEXT NOT NULL         --   electoral systems
);

CREATE TABLE epochs (
  epoch_id TEXT PRIMARY KEY,       -- 'ep_…'
  full_hash TEXT NOT NULL,         -- the untruncated content hash
  world_id TEXT NOT NULL REFERENCES worlds,
  data_version TEXT NOT NULL,      -- 'dv_…' full lineage (Encyclopedia)
  population_data_version TEXT NOT NULL,  -- 'dv_…' epoch-hash input (04)
  synth_config TEXT NOT NULL, seed INTEGER NOT NULL,
  status TEXT NOT NULL,            -- synthesising|validating|published|
  snapshot_prefix TEXT,            --   superseded|failed (CHECKed)
  validation TEXT,                 -- JSON: per-seat fidelity summary
  published_at TEXT
);
CREATE INDEX epochs_published
  ON epochs (world_id, status, published_at DESC);

CREATE TABLE forks (
  fork_id TEXT PRIMARY KEY,        -- 'fk_' hash(epoch, skews, seed)
  world_id TEXT NOT NULL, epoch_id TEXT NOT NULL REFERENCES epochs,
  name TEXT NOT NULL, seed INTEGER NOT NULL, created_at TEXT NOT NULL,
  skews TEXT NOT NULL              -- JSON: ordered skew ops
);

CREATE TABLE layers (
  world_id TEXT NOT NULL, layer_id TEXT NOT NULL,   -- 'income@2'
  kind TEXT NOT NULL CHECK (kind IN ('base','modelled','contextual')),
  definition TEXT NOT NULL,        -- JSON: columns, sources, method
  holdout TEXT,                    -- JSON: validation result
  PRIMARY KEY (world_id, layer_id)
);

CREATE TABLE epoch_layers (        -- which layer versions an epoch carries
  epoch_id TEXT NOT NULL, layer_id TEXT NOT NULL, applied_at TEXT NOT NULL,
  PRIMARY KEY (epoch_id, layer_id)
);
```

### Encyclopedia catalogue — `ENCYCLOPEDIA_DB`

```sql
CREATE TABLE sources (
  world_id TEXT NOT NULL, source_id TEXT NOT NULL,  -- 'ge-results-2024'
  tier INTEGER NOT NULL CHECK (tier IN (1,2,3)),
  manifest TEXT NOT NULL,          -- JSON: the manifest as deployed
  manifest_hash TEXT NOT NULL, cadence TEXT,        -- 'weekly' | …
  PRIMARY KEY (world_id, source_id)
);

CREATE TABLE locks (               -- MANIFEST.lock as rows (see 05)
  world_id TEXT NOT NULL, source_id TEXT NOT NULL,
  content_hash TEXT NOT NULL, bytes INTEGER NOT NULL,  -- pinned sha256
  artefact_key TEXT NOT NULL,      -- R2: raw/uk/…
  fetched_at TEXT NOT NULL, pinned_at TEXT NOT NULL,
  pinned_by TEXT NOT NULL,         -- Access identity | 'system'
  supersedes TEXT,                 -- previous hash: re-pin history
  PRIMARY KEY (world_id, source_id, content_hash)
);

CREATE TABLE ingest_runs (
  ingest_id TEXT PRIMARY KEY,      -- 'ing_' ULID
  world_id TEXT NOT NULL, source_id TEXT NOT NULL, workflow_id TEXT,
  stage TEXT NOT NULL,             -- fetch|verify|stage|load|derive
  status TEXT NOT NULL, detail TEXT,   -- JSON: check results, errors
  started_at TEXT NOT NULL, finished_at TEXT
);

CREATE TABLE data_versions (
  data_version TEXT PRIMARY KEY,   -- 'dv_' hash(world, {src → hash})
  world_id TEXT NOT NULL, created_at TEXT NOT NULL,
  components TEXT NOT NULL         -- JSON {sourceId → contentHash}
);
```

### Vault — `VAULT_DB`

```sql
CREATE TABLE scenarios (
  scenario_hash TEXT PRIMARY KEY,  -- 'sc_…' (cosmetic fields excluded)
  full_hash TEXT NOT NULL,         -- the untruncated SHA-256 (see 06)
  world_id TEXT NOT NULL, slug TEXT NOT NULL, version INTEGER NOT NULL,
  doc TEXT NOT NULL,               -- JSON scenario document (see 06)
  extends TEXT,                    -- parent scenario_hash | NULL
  status TEXT NOT NULL,            -- draft|published|retired
  created_at TEXT NOT NULL, UNIQUE (world_id, slug, version)
);

CREATE TABLE questions (           -- id = slug@version
  world_id TEXT NOT NULL, slug TEXT NOT NULL, version INTEGER NOT NULL,
  doc TEXT NOT NULL,               -- JSON: instrument, frame, resolver,
  status TEXT NOT NULL,            --   outcome fns, caveats (see 07)
  created_at TEXT NOT NULL, PRIMARY KEY (world_id, slug, version)
);

CREATE TABLE runs (                -- one row per tuple execution
  run_id TEXT PRIMARY KEY,         -- 'run_' ULID
  world_id TEXT NOT NULL, population_id TEXT NOT NULL,  -- 'ep_…'|'fk_…'
  scenario_hash TEXT NOT NULL, engine_version TEXT NOT NULL,
  question_slug TEXT NOT NULL, question_version INTEGER NOT NULL,
  reference_date TEXT NOT NULL,    -- ISO date pinned at launch; Mule
                                   --   decay + polling freshness (08)
  seed INTEGER NOT NULL, iterations INTEGER NOT NULL,
  status TEXT NOT NULL,            -- queued|compiling|running|
  coordinator_id TEXT,             --   aggregating|done|failed
  artefact_prefix TEXT,            -- R2: runs/uk/run_…/
  created_at TEXT NOT NULL, finished_at TEXT
);
CREATE UNIQUE INDEX runs_dedupe    -- dedupe key: tuple + iterations
  ON runs (world_id, population_id, scenario_hash, question_slug,
           question_version, engine_version, reference_date, seed,
           iterations);
CREATE INDEX runs_by_question
  ON runs (world_id, question_slug, question_version, run_id DESC);

CREATE TABLE outcomes (
  outcome_id TEXT PRIMARY KEY,     -- 'out_' ULID
  run_id TEXT NOT NULL REFERENCES runs,
  headline TEXT NOT NULL,          -- JSON: shares, seats, intervals
  caveat_ledger TEXT NOT NULL,     -- JSON: ordered id@version + params
  artefact_keys TEXT NOT NULL,     -- JSON: R2 keys for full results
  revealed_at TEXT NOT NULL
);
```

The headline lives in D1 for fast listing; full per-seat distributions and
crosstabs are R2 artefacts the outcome row points at.

### Demerzel audit — `DEMERZEL_DB`

```sql
CREATE TABLE audit_log (           -- append-only; never updated
  audit_id TEXT PRIMARY KEY,       -- 'aud_' ULID (doubles as timestamp)
  actor TEXT NOT NULL,             -- Access identity
  role TEXT NOT NULL,              -- owner|operator|viewer
  method TEXT NOT NULL, path TEXT NOT NULL,
  service TEXT NOT NULL,           -- routed target
  action TEXT NOT NULL,            -- 'launch-run'|'pin-source'|…
  resource_type TEXT, resource_id TEXT,  -- 'run', 'run_01j9dq3zx8k7'
  origin TEXT NOT NULL,            -- console|api|cron
  status INTEGER NOT NULL, latency_ms INTEGER, request_id TEXT NOT NULL
);
```

Demerzel's own cron exports closed months to the dedicated audit bucket
(`audit/uk/2026-08.parquet` in `seldon-audit`, bound to Demerzel alone)
and prunes, keeping D1 small and the history permanent.

## The shard DO SQLite schema

One Durable Object per `(world, seat, epoch)`, named
`uk:E14001156:ep_5f9c2a1d44e0`, holding that seat's slice of that epoch
(~43k households, ~75k persons, ~50–200 cells; tens of MB — far under
the 10 GB object limit). The published epoch's 650 objects stay hot;
superseded epochs hydrate on demand (below):

```sql
CREATE TABLE meta (                -- one row: what this shard holds
  world_id TEXT, seat_id TEXT, epoch_id TEXT,  -- = the DO's naming key
  published_at TEXT,
  hydration TEXT,                  -- cold|hydrating|live|evicted
  layer_versions TEXT, row_counts TEXT  -- JSON {column → layer_id@ver}
);

CREATE TABLE households (
  hh_local INTEGER PRIMARY KEY,    -- global id: uk:E14001156:hh:<hex>
  size INTEGER NOT NULL, composition TEXT NOT NULL, -- census classes
  tenure TEXT NOT NULL,            -- owned|mortgage|social-rent|private-rent
  oa_code TEXT NOT NULL,           -- L4 small area (placement basis)
  lat REAL NOT NULL, lon REAL NOT NULL,  -- synthetic, density-weighted
  -- layer columns appended by layer application, e.g.:
  income_band TEXT, energy_rating TEXT,
  deprivation_quintile INTEGER, house_price_band TEXT
);

CREATE TABLE persons (
  p_local INTEGER PRIMARY KEY,     -- uk:E14001156:p:<hex>
  hh_local INTEGER NOT NULL REFERENCES households,
  age INTEGER NOT NULL, sex TEXT NOT NULL,
  qualification TEXT NOT NULL,     -- none|level1|level2|apprenticeship|
                                   --   level3|level4plus (06's registry)
  activity TEXT NOT NULL,          -- employed|unemployed|retired|…
  registered INTEGER NOT NULL,     -- 0|1, from the registration layer
  income_band TEXT,                -- layer column
  cell_local INTEGER NOT NULL REFERENCES cells
);
CREATE INDEX persons_by_cell ON persons (cell_local);
CREATE INDEX persons_by_hh ON persons (hh_local);

CREATE TABLE cells (               -- the engine's unit (see 08)
  cell_local INTEGER PRIMARY KEY,  -- uk:E14001156:cell:<n>
  age_band TEXT, sex TEXT, qualification TEXT,
  tenure TEXT, income_band TEXT, activity TEXT,
  n_persons INTEGER NOT NULL, n_registered INTEGER NOT NULL
);

CREATE TABLE fork_cells (          -- lazily materialised fork deltas
  fork_id TEXT NOT NULL, cell_local INTEGER NOT NULL,
  n_persons INTEGER NOT NULL, n_registered INTEGER NOT NULL,  -- post-skew
  PRIMARY KEY (fork_id, cell_local)
);

CREATE TABLE run_leanings (        -- hot copy of a standing run's
  run_id TEXT NOT NULL,            --   per-cell artefact (see 04)
  cell_local INTEGER NOT NULL REFERENCES cells,
  distribution TEXT NOT NULL,      -- JSON {optionId → mean share}
  turnout REAL NOT NULL,
  touched_by TEXT NOT NULL,        -- JSON: matched rule/Mule ids
  PRIMARY KEY (run_id, cell_local)
);
```

Design points, honestly traded:

- **Layers are columns, not rows.** An entity–attribute–value table was
  rejected: it multiplies rows by attributes and kills typed predicates.
  Wide columns mean the DSL compiles to plain SQL (`tenure =
  'social-rent' AND age > 65`) and explore counts are index scans. The
  cost — `ALTER TABLE ADD COLUMN` across 650 shards per layer — is
  fine: publication is already a fan-out workflow and SQLite's
  `ADD COLUMN` is O(1).
  Per-row provenance is deliberately *not* stored: it is constant per
  column, lives in `meta.layer_versions`, and the dossier joins
  column → layer at read time.
- **Cells carry denormalised signature columns**, so a frame predicate
  selects cells without touching persons — a run never reads the persons
  table at all ([08-engine](08-engine.md)).
- **Forks store deltas, not copies**: rewritten cell weights (plus
  appended synthetic persons for cohort-adding skews); browsing a fork
  is epoch households plus the overlay.
- **Shards are epoch-keyed, never rebuilt in place.** A publish creates
  the new epoch's 650 objects and keeps them hot; a superseded epoch's
  objects hydrate on demand from its R2 snapshot and are evicted when
  idle — `cold → hydrating → live → evicted`, re-hydratable, with the
  state machine driven by Radiant. Browsing a superseded epoch
  therefore works; the first hit is slower, and the console discloses
  it. R2 Parquet snapshots are retained for every epoch — the cheap
  durable form — while shard-resident copies and tiles are disposable
  and rebuildable ([04-population](04-population.md) states the
  retention policy).
- **Standing-run leanings are cached shard-side.** After a standing
  run, the run's per-cell `cells` artefact is pushed to every shard as
  one `run_leanings` row per cell, keyed by run id; dossiers join it
  locally, and Radiant falls back to Vault RPC when the copy is absent
  ([04-population](04-population.md)).

## R2 layout

Five buckets, split by lifecycle and access pattern. Physical names are
env-suffixed (`seldon-epochs-production`); binding names are
env-invariant (below). Keys put the world id first
after the family prefix; content-addressed segments are immutable —
**nothing under a hash or ULID key is ever overwritten**.

```
seldon-datasets/            (Encyclopedia; binding DATASETS_BUCKET)
├── raw/uk/<sourceId>/<fetchedAtISO>/<filename>     # immutable fetches
├── staged/uk/<sourceId>/<contentHash>/<table>.parquet
└── locks/uk/<sourceId>/<pinnedAtISO>.json          # lock history

seldon-epochs/              (Radiant; binding EPOCH_BUCKET)
├── epochs/uk/ep_5f9c2a1d44e0/
│   ├── manifest.json                       # config, counts, hashes
│   ├── validation/E14001156.json           # per-seat fidelity
│   └── seat=E14001156/{households,persons,cells}.parquet
└── forks/uk/fk_9a01bb37c2d4/seat=E14001156/…       # materialised on use

seldon-tiles/               (Radiant → Terminus; binding TILE_BUCKET)
└── tiles/uk/ep_5f9c2a1d44e0/{households,boundaries}.pmtiles

seldon-runs/                (Vault + Psychohistory; binding RUN_BUCKET)
├── runs/uk/run_01j9dq3zx8k7/
│   ├── plan.json                           # compiled plan (audit copy)
│   ├── seats/E14001156.parquet             # per-seat distributions
│   ├── cells.parquet                       # per-cell mean distribution,
│   │                                       #   turnout, matched rule ids
│   └── outcome/{distributions,crosstabs}.parquet
└── exports/uk/out_01j9dqm2w4p9/<format>…   # user-requested exports

seldon-audit/               (Demerzel only; binding AUDIT_BUCKET)
└── audit/uk/2026-08.parquet                # closed-month audit export
```

Tiles get their own bucket because their profile differs: range-request,
high-volume reads through Terminus (R2's zero egress is the point), and
rebuilt per epoch with old builds deletable — unlike archival snapshots.
The audit bucket is separate for the opposite reason: it is bound to
Demerzel alone, so the export path never crosses another service's
bucket boundary.

## Iceberg and R2 SQL

Staged datasets and epoch snapshots are registered in the **R2 Data
Catalog** as Apache Iceberg tables; heavy analytical queries run via
**R2 SQL** instead of hauling Parquet through Workers. This is the v3
home of the role DuckDB played in v2 ([14-decisions](14-decisions.md)
D4). Registration convention: one R2 Data Catalog namespace per world
and family — `uk_staged` (one table per staged source table, e.g.
`uk_staged.ge_results_2024`) and `uk_population` (`households`,
`persons`, `cells`, partitioned by `epoch_id, seat_id`; each epoch
publish appends its partitions). Keeping all epochs in one partitioned
table, rather than a table per epoch, makes cross-epoch questions one
query.

There is no Workers-native way to write an Iceberg table: a commit is
coordinated metadata and manifest writes that only a real Iceberg
client performs. The ingestion and epoch-publish Workflows therefore
invoke a small Container step — PyIceberg `add_files`/append — to
commit staged and snapshot Parquet into the Data Catalog
([05-datasets](05-datasets.md)). Catalog operations and R2 SQL queries
authenticate with a Cloudflare API token held as a Worker secret
([12-deployment](12-deployment.md)), not a binding.

```sql
-- National tenure × qualification crosstab for the published epoch
SELECT tenure, qualification, SUM(n_persons) AS persons
FROM uk_population.cells
WHERE epoch_id = 'ep_5f9c2a1d44e0'
GROUP BY tenure, qualification;

-- Layer validation: modelled income vs staged ONS small-area estimates
SELECT p.seat_id, p.income_band,
       COUNT(*) AS modelled, ANY_VALUE(o.households) AS published
FROM uk_population.households p
JOIN uk_staged.constituency_income o
  ON o.seat = p.seat_id AND o.band = p.income_band
WHERE p.epoch_id = 'ep_5f9c2a1d44e0'
GROUP BY p.seat_id, p.income_band;
```

Epoch-over-epoch drift (registered adults per seat between two epoch
ids) is the same pattern filtered to two partitions. Honest caveat:
R2 Data Catalog and R2 SQL are open-beta products. The SQL surface
covers these queries (GROUP BY, joins, CTEs, window functions), but as
a beta the grammar may change. The Parquet layout therefore stays
engine-neutral (plain Hive-partitioned files under stable keys), so
the fallback is mechanical: a Container-hosted query engine over the
same objects, per decision [D4](14-decisions.md). Analytics is a consumer of the layout, never its owner.

## KV namespaces

Caches only — everything here is reconstructible, and invalidation is by
**key change, not overwrite**: values sit under content-derived or
versioned keys, so a stale read is at worst a previous version, never a
torn one.

| Binding | Contents | Key pattern | Freshness |
| --- | --- | --- | --- |
| `POLLS_KV` | Poll-of-polls (`polling_now`) | `polls:uk:<dataVersion>` + `polls:uk:latest` pointer | Rewritten by ingestion; pointer swap |
| `PLANS_KV` | Compiled scenario+question plans | `plan:<pl_hash>` | Immutable; TTL 30 d |
| `AGG_KV` | Hot aggregates (standing headline, seat rollups) | `agg:uk:<epochId>:<key>` | Rewritten per standing run |
| `TILES_KV` | Tile manifests (which PMTiles per epoch) | `tiles:uk:<epochId>` | Written at tile build |
| `ACCESS_KEYS_KV` | Access public keys (Demerzel JWT verification) | `access:certs:<kid>` | Refreshed on rotation |
| `FLAGS_KV` | Feature flags | `flag:<name>` | Operator-set |

## Binding naming conventions

Bindings are code-facing and **environment-invariant**; physical resource
names carry the environment (`seldon-radiant-db-staging`) and are owned
by `infra/` ([12-deployment](12-deployment.md)). Rules:

- `SCREAMING_SNAKE`, suffixed by resource type: `_DB` (D1), `_BUCKET`
  (R2), `_KV`, `_QUEUE` / `_DLQ`, `_DO` (DO namespace), `_WF` (Workflow).
- Prefix with the owning service when the resource is service-private
  (`RADIANT_DB`, `VAULT_DB`); use the domain noun when the resource is a
  shared artery (`EPOCH_BUCKET`, `SIM_TASKS_QUEUE`).
- Service-to-service bindings are the plain service name: `RADIANT`,
  `VAULT`, `ENCYCLOPEDIA`, `PSYCHOHISTORY`.
- Canonical set (owner → binding): Radiant → `RADIANT_DB`,
  `EPOCH_BUCKET`, `TILE_BUCKET` (write: tile builds), `SHARD_DO`,
  `WORLD_REGISTRY_DO`, `SYNTH_WF`, `SYNTH_TASKS_QUEUE`; Encyclopedia →
  `ENCYCLOPEDIA_DB`, `DATASETS_BUCKET`, `INGEST_WF`; Psychohistory →
  `COORDINATOR_DO`, `SIM_TASKS_QUEUE` (+ `SIM_TASKS_DLQ`), `PLANS_KV`,
  `RUN_BUCKET` (write: run artefacts, per 08);
  Vault → `VAULT_DB`, `RUN_BUCKET`; Demerzel → `DEMERZEL_DB`,
  `ACCESS_KEYS_KV`, `AUDIT_BUCKET`; Terminus → `TILE_BUCKET` (read:
  tile serving); shared → `POLLS_KV`, `AGG_KV`, `TILES_KV`, `FLAGS_KV`.
- The name→binding constant table lives in `@seldon/foundation`, so app
  code and Pulumi never drift.

Related: [03-architecture](03-architecture.md) ·
[04-population](04-population.md) · [05-datasets](05-datasets.md) ·
[08-engine](08-engine.md) · [11-api](11-api.md) ·
[12-deployment](12-deployment.md) · [14-decisions](14-decisions.md)
