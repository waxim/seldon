# v2 Architecture

## Language and runtime: TypeScript on Bun — kept, deliberately

The instinct to "go wild" was considered. Candidates:

- **Rust or Go** — real speed for synthesis and Monte Carlo, but the hot loops
  in v1 were already fast (100 iterations over ~40k cells in ~8s including
  startup), the bottleneck is data wrangling not arithmetic, and we'd forfeit
  porting the best v1 code (DSL, scenario compiler, renderers) plus iteration
  speed. Not worth it for a two-order-of-magnitude-smaller problem than it
  looks: the engine works on **cells** (tens of thousands), not households
  (tens of millions). If a hot loop ever genuinely hurts, that single function
  can move to Rust via a native module later.
- **Python** — the natural psephology/stats ecosystem (pandas, PyMC), but we'd
  rewrite everything, lose the typed end-to-end story, and a distributable CLI
  is more painful.
- **TypeScript + Bun** — keeps the salvageable 30% of v1, single toolchain,
  `bun:sqlite` built in, fast enough, and `bun build --compile` gives a
  single-binary CLI if we ever want one.

**Decision: TypeScript + Bun.** The wildness goes into the data layer instead.

## The big simplification: no services, no Postgres

v1's three-app topology (CLI + two HTTP services + two Postgres databases +
PostGIS + portless vanity URLs) existed to serve an integration that was never
built, and gated only the broken half of the product. All of it goes.

**v2 is a single process.** The CLI links the engine and the data layer as
libraries. State is files in the repo's `data/` directory:

```
data/
  manifests/*.yaml        # declarative source definitions (committed)
  raw/<source>/<ver>/     # fetched artefacts, checksummed (gitignored)
  staged/<source>/        # cleaned tabular outputs, Parquet (gitignored)
  seldon.duckdb           # the warehouse: loaded sources + derived tables (gitignored)
  population/<dataVer>/   # synthesised households, Parquet (gitignored)
  runs/                   # run artefacts, JSON + Parquet (gitignored)
  MANIFEST.lock           # dataVersion: content hashes of every loaded source (committed)
```

## Data layer: DuckDB + Parquet

The genuinely new bet. Rationale:

- The pipeline is tabular ETL: census tables, results CSVs, lookups, joins,
  aggregations. Hand-rolled CSV/xlsx code was v1's most fragile surface
  (regex OOXML parser, unprocessable `.xls`/`.ods`). DuckDB reads CSV, Parquet,
  and (via extensions) spreadsheets and even remote URLs; transforms become
  short SQL, not bespoke stream code.
- "Explore almost every household" over ~28M rows is exactly DuckDB's sweet
  spot: columnar scans with predicate pushdown over Parquet, interactive on a
  laptop, zero server.
- Parquet as the interchange format makes every pipeline stage inspectable
  with any tool, and the population becomes a portable artefact.

**Risk & fallback:** DuckDB's Node bindings under Bun need a spike (M0). If
they misbehave, fallback is `bun:sqlite` (zero-dependency, built-in) for the
warehouse plus our own Parquet writing via a maintained library — the
architecture doesn't change, only query ergonomics. The spike decides; the
interfaces (`Warehouse`, `PopulationStore`) are written so the engine never
knows which backend is underneath.

**Spike outcome (M0, decided):** `@duckdb/node-api@1.5.4` installs and runs
clean under Bun 1.3.14 — no native-binding friction, no postinstall trust
issues. Measured on the dev laptop: build + Parquet-write of a 10M-row table
in ~520ms; a `GROUP BY` aggregate over that Parquet in **47ms**; CSV round-trip
fine. That is comfortably inside the "interactive on a laptop" and
"<30s national run" budgets, so **DuckDB is adopted**; the `bun:sqlite`
fallback is not needed. The `Warehouse` interface (`src/store/warehouse.ts`)
still hides it, so the fallback remains available if a future platform breaks
the bindings.

## Module layout: one app, thin internal boundaries

The eight-package monorepo produced ceremony (five packages with zero tests,
phantom dependencies, turbo tasks that never run). v2 collapses to a single
workspace package with enforced-by-convention internal modules:

```
src/
  cli/          # commander wiring, output rendering (console + HTML report)
  core/         # domain types + Zod schemas (v1 types/schema pattern, kept)
  scenario/     # assumption sets, DSL, hashing, presets (ported from v1)
  data/         # manifest registry, fetch, stage, load, verify (v1 design, fixed)
  synth/        # marginals derivation, IPF, household generation, skew ops
  engine/       # cells, scenario compiler, Monte Carlo, aggregate, backtest
  store/        # warehouse + population + run stores (DuckDB/Parquet behind interfaces)
```

Turborepo goes (nothing to orchestrate). Biome stays. `bun test` stays.
If a piece later needs independent versioning it can graduate to a package;
nothing starts as one.

## Keep / port / drop ledger

| v1 asset | Fate |
| --- | --- |
| Assumptions DSL, hashing, presets | **Port** into `src/scenario/`, add field-name validation, single source of truth for presets (code generates the JSON) |
| Scenario compiler, Monte Carlo, aggregate, winner | **Port** into `src/engine/`, re-pointed at real data; fix cell-jitter inertness (see 06) |
| IPF, largest-remainder, skew engine, RNG | **Port** into `src/synth/` |
| Source YAML schema, fetch hardening, recover flow | **Port** into `src/data/`; add checksums; `needs-url` actually used |
| Console renderer, HTML report | **Port**, extend |
| types + Zod pattern, config, logger | **Port** (collapsed into `src/core/`) |
| Party registry | **Port**; drop the unused exports until something needs them |
| Procedural population generator | **Demote** to a test fixture named `fixtures/toy-country.ts` |
| Sim mode (noise floor) | **Keep** — it's ~200 lines and a good smoke test |
| psephos-api HTTP service, Hono routes, Drizzle, migrations | **Drop** |
| psephos-model HTTP service + dead Postgres runs DB | **Drop** |
| `seldon up/down/status`, stack state, portless | **Drop** (nothing to boot) |
| `@seldon/client` | **Drop** (no API to call) |
| Hand-rolled xlsx parser | **Drop** — DuckDB/proper library reads spreadsheets |
| S3 mirror | **Drop for now**; revisit if fetch flakiness demands a shared cache |
| `snapshot` stubs | **Replace** with `MANIFEST.lock` + run addressing (see 04) |

## Reproducibility model

- `dataVersion` = hash of `MANIFEST.lock` (which pins every source's content
  hash and retrieval date). Committed, so a checkout knows exactly which data
  it expects.
- `populationVersion` = `(dataVersion, synthesis seed, synth code version)`.
- A run = `(populationVersion, assumptionHash, modelVersion, seed)` — same
  tuple, same output, enforced by a determinism test in CI.

## Testing strategy (v1's gap)

- Unit tests port with their subsystems (DSL, IPF, skew, hash).
- **Golden pipeline tests**: tiny checked-in fixture files for each source
  format run through the real stage/load code.
- **Marginal-fidelity test**: synthesised population vs census marginals per
  constituency within tolerance — the synthesis contract, run in CI at
  reduced scale.
- **Backtest as CI gate**: hindcast 2024 from 2019 notionals at reduced
  iterations; fail if seat-call accuracy drops below the recorded baseline.
- **No test may import the toy-country fixture outside `engine/` unit tests.**
