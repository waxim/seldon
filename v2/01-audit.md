# v1 Audit

Audited: every file in `apps/seldon`, `apps/psephos-api`, `apps/psephos-model`,
all eight `packages/*`, all 40 `data/sources/*.yaml`, docs, and tooling config —
plus hands-on runs of every CLI command. Snapshot: commit `70a5b93`.

## Summary matrix

| Subsystem | Looks like | Actually is |
| --- | --- | --- |
| CLI surface (`apps/seldon`) | 14 command groups | Well-built, but half the commands dead-end on stubs |
| Data fetch/process | 40 declarative YAML sources | ~80% real; hardened fetcher; 3 sources unprocessable, 1 always throws |
| Data load → DB | `seldon data load/sync` | **0% real** — API returns `501 not implemented` for every source |
| Household synthesis (`psephos-api`) | IPF over census marginals | Correct, tested algorithm; **its input table is never written by anything** |
| Electorate fork/skew | 6 skew ops, lineage tracking | Real and well-tested; useless without a canon to fork |
| SHARP engine (`psephos-model`) | Household-level Monte Carlo | Real maths over a **procedurally-invented country**; households mostly inert |
| Backtest | 93.5% call accuracy vs 2024 | **Circular** — scores against data its own generator fabricated |
| Services/stack (`up`/`down`/portless) | Local orchestration | Works, but only gates the broken half of the product |
| Shared packages | 8 packages | types/schema/assumptions/config/logger real; client/geo half-orphaned |

Build health: `bun run typecheck` — 11/11 green. `bun run test` — 29/29 pass.
The tests pass because they test the fabricated world's internal consistency.

## The central defect: two disconnected halves

**Half A — the data world.** YAML source registry → fetch → process →
`seldon data load` → `psephos-api` ingest → Postgres → IPF synthesis →
canonical household electorate → fork/skew → typed streaming client.

**Half B — the model world.** `seldon run` → `executeRun` →
`generatePopulation(seed 20240704)` → cells → scenario compile → Monte Carlo →
report.

These halves never touch:

- `apps/psephos-model` declares `@seldon/client` as a dependency
  (`package.json:23`) but **no source file imports it**.
- `client.streamHouseholds` — the marquee "engine consumes millions of
  households" method — has **zero callers repo-wide**.
- `generatePopulation` (`apps/psephos-model/src/engine/population.ts:672`)
  fabricates all 650 seats from hardcoded `REGIONS` constants (lines 121–230):
  invented names from a `TOPONYMS` list, `S001`-style IDs instead of ONS codes,
  gaussian electorate sizes (`73000 + N(0,7000)`), random red-wall flags.
- Its own docstring claims it builds "an equivalent population in process" to
  the psephos-api canon. There is no equivalence and no data path. Several
  docstrings describe integrations that were never built — the comments
  actively mislead.

## The data pipeline, in detail

**Declared:** 40 sources, all `status: ready`, all with fetch URLs. 23 are
`normalised: true` (destined for the DB) mapping to 8 `apiSource` groups.

**Fetch** (`apps/seldon/src/data/fetch.ts`) — real and the most
production-hardened code in the repo: browser UA for gov.uk bot walls, genuine
ONS ArcGIS "export still generating" retry/backoff.

**Process** (`data/process.ts`, `steps.ts`) — declarative steps (`unzip`,
`csv-select`, `csv-rename`, `csv-filter`, `xlsx-extract`, `custom`, …) all
genuinely implemented, including a hand-rolled read-only `.xlsx` OOXML parser.
But:

- **`.xls` and `.ods` are unprocessable.** `ni-deprivation-measure` (.xls),
  `welsh-index-of-deprivation` (.ods), `house-prices` (zip→.xls) declare
  `process: []`; their own YAML notes admit they "need a custom processor"
  that doesn't exist. Processing "succeeds" and emits an unusable binary blob.
- **`population-estimates` always throws** — `process: []` but
  `output.processed: population-estimates.xlsx` while the fetched file keeps
  its URL basename `sapelsoasyoa20222024.xlsx`; the output check
  (`process.ts:33-36`) fails every run.
- **Exactly 1 custom processor exists** (`democracy-club-parties`) for 40
  sources.
- **0 of 40 sources declare a checksum**, so `seldon data verify` can only
  compare a file to itself.

**Load — the dead end:**

- `POST /ingest/:source` returns `{ error: "not implemented" }, 501`
  (`apps/psephos-api/src/routes/ingest.ts:13-14`); job polling likewise
  (`:19-20`). All 8 loaders in `src/ingest/sources.ts:25-51` are
  `stub()` factories that reject with `not implemented`.
- Even if unstubbed, the contract is broken: the CLI sends only the
  `apiSource` *name* — no file paths, no upload. The API is expected to
  independently find `data/processed/` via an unwired filesystem convention.
- Consequence: **no code path anywhere populates the database.** Every table
  except `electorates`/`households`/`persons` has no writer at all —
  `constituencies`, `wards`, `parties`, `elections`, `constituency_results`,
  `mrp_estimates`, `ingest_jobs`… all migrated, all forever empty.

## Synthesis: correct algorithm, no input

- The IPF implementation (`apps/psephos-api/src/synthesis/ipf.ts:72-133`) is a
  genuine iterative-proportional-fitting routine with largest-remainder
  integerisation, deterministic per seed, well-tested.
- It reads ward marginals from the `ward_demographics` table
  (`synthesise.ts:62-69`). Grep the repo: that table has **no INSERT
  anywhere**. `POST /synthesis` therefore always throws
  `"no ward demographics loaded"` — verified live.
- The missing stage isn't just the loader: nothing exists to aggregate
  Output-Area census CSVs up to ward marginals at all.
- Fork/skew (`electorate/store.ts`, `skew.ts`) is real, deterministic,
  well-tested — six op kinds with lineage tracking. It has nothing to fork.
- Minor: `writeCanon` deletes the old canon before writing the new one with no
  transaction — a mid-write failure leaves an empty canon.

## The engine: real statistics, fake country

The pipeline (population → cells → scenario compile → Monte Carlo → aggregate
→ FPTP winner) is methodologically coherent:

- Scenario compilation is the most sophisticated part: swing applied in share
  space then converted to log-odds; headwinds as incumbency-conditioned
  shifts; DSL predicates evaluated once per demographic cell; effects blended
  in probability space.
- Monte Carlo draws jitter at national/constituency/cell layers, sums
  log-odds, softmaxes, applies tactical transfers, computes **expected votes**
  (no ballot sampling — documented, defensible).

But:

- **The country is invented** (see above). Real 2024 numbers exist only as
  approximate regional aggregates baked into `REGIONS`.
- **Cell jitter is nearly inert** — drawn independently per cell, it averages
  out across a seat's cells; seat-level uncertainty is entirely the national
  and constituency layers.
- **With no demographic rules, the household machinery does nothing** — every
  cell in a seat shares the same base log-odds, so the run collapses to
  uniform-national-swing-plus-noise. The system's headline feature only bites
  when rules key on demographics, and then only against invented demographics.
- **Reported uncertainty is hand-set** — the intervals reflect chosen jitter
  constants, not estimated variance.

## The backtest grades its own homework

`profile.prior` ("2019") is literally `baseline − SWING_2019_TO_2024 +
N(0, 0.035)` (`population.ts:552-563`) — the "2019 election" is derived from
the invented "2024 result" by subtracting a hardcoded swing vector. The
backtest then re-applies that swing's aggregate and scores against
`argmax(baseline)`. Recovering ~93% of seats is close to guaranteed by
construction. The docstring even warns "a model that scored a perfect
hindcast here would simply be memorising its own inputs" — which is what it
does. Also: the Brier score is single-class on the modal winner only, and
mean share error only scores the winner's share.

## Dead code and stubs inventory

- `seldon snapshot list|create` — both `throw new Error("not implemented")`
  (`commands/snapshot.ts:16,24`), despite reproducible snapshots being a
  documented headline feature.
- The model's entire Postgres persistence layer (`db/schema.ts`, `db/client.ts`,
  migrations, `drizzle.config.ts`) — migrated by `seldon up`, **never read or
  written**; runs actually persist to JSON files. `drizzle-orm` is a
  dependency solely for this dead code.
- The model's HTTP service (`Bun.serve` + Hono `/runs` routes) — started by
  `seldon up`, bypassed by every CLI command (all in-process library calls).
- `portless` integration (`stack/portless.ts`) — polished vanity-URL plumbing
  for a stack whose useful half doesn't need services at all.
- `geo.GROUPINGS.redWall/blueWall` — empty arrays, "populated from boundary
  ingest" that never happened; the model reinvents red-wall flags with RNG.
- Unused exports: `parties.{PARTY_LEAN, PARTY_PRIMARY_FAMILY, GB_PARTIES,
  NI_PARTIES, normaliseParty}`, `geo.{getRegion, nationOf, inGrouping}`.
- The `needs-url` source status — supported everywhere, used by zero sources.
- Preset duplication: `packages/assumptions/src/presets.ts` factories and
  `/assumptions/*.json` are the same data in two unlinked places that can
  drift.
- 5 of 8 packages have zero tests; turbo declares `dist/**` outputs no package
  produces; the turbo `lint` task is never invoked; stale `.turbo` logs are
  committed.

## DSL footgun worth recording

`parsePrimary` (`packages/assumptions/src/dsl.ts:281-285`) treats any unknown
identifier as a bare string literal. `agee > 50` or `degre == true` compiles
cleanly and silently matches nobody — in a system whose selling point is
auditable assumptions, field-name typos are undetectable. v2 must validate
identifiers against a field schema.

## What deserves to survive

In rough order of quality:

1. **Assumptions DSL + hashing + presets** (`packages/assumptions`) — finished,
   tested, genuinely wired into the engine. Fix the identifier footgun.
2. **Scenario compiler and Monte Carlo core** (`engine/scenario.ts`,
   `montecarlo.ts`, `aggregate.ts`, `winner.ts`) — port the maths onto real
   data.
3. **IPF synthesiser + skew engine** (`psephos-api/src/synthesis`,
   `electorate/skew.ts`) — port; finally feed them.
4. **Fetcher hardening + declarative source registry + process steps**
   (`apps/seldon/src/data`) — keep the design, replace the load stage, add
   checksums, use a real spreadsheet library.
5. **Console/HTML rendering** (`render/`, `report-html.ts`) — keep.
6. **types + Zod schema discipline, config, logger** — keep the pattern.
7. **Party registry** (`packages/parties`) — real, complete, correct colours.
8. **Sim mode** as a noise-floor concept — cheap to keep.
