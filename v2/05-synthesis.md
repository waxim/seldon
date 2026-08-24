# v2 Household Synthesis

The SHARP premise — a synthetic household population for the whole UK — kept,
finally fed with real marginals, and simplified where v1 over-reached.

## What we're building

For each of the 650 constituencies, a population of synthetic households
whose **published census marginals match reality**: age×sex structure,
tenure, highest qualification, economic activity, household size/composition.
At full scale that's ~28M households / ~50M adults UK-wide, generated once
per `dataVersion` and stored as Parquet, partitioned by constituency.

Two honest framings, stated up front:

- These are **statistically representative households, not real ones**. We
  match marginal distributions (and what joint structure IPF + household
  packing can recover); the true joint distribution is not observable from
  published tables. "Explore almost every household in the UK" means "explore
  a population statistically indistinguishable from the UK at the published
  level of detail" — that's the honest and legally sane version of the pitch,
  and it's plenty.
- The engine doesn't need households to forecast — it needs **cells** (see
  06). Households exist for the explore experience, for household-level
  effects (e.g. "households where the pensioner outnumbers the graduate"),
  and for skew transforms. That's why synthesis is Milestone 3, after the
  first real forecast, not before it.

## Geography: constituency-first (the big v1 simplification)

v1 planned OA→ward→constituency lookups with PostGIS geometry — five lookup
sources and a spatial database for what is, for our purposes, a grouping key.

v2 synthesises **directly at constituency level**:

- ONS publishes Census 2021 tables re-aggregated to the **2024 Westminster
  constituencies** for England & Wales — no lookup chain needed for 575 of
  650 seats.
- Scotland: NRS census tables at datazone level, aggregated up via the
  published datazone→constituency lookup (one lookup, no geometry).
- NI: NISRA constituency-level headline tables; coarser is fine for phase 1.

PostGIS, boundary polygons, and ward-level anything are dropped. If we later
want maps beyond the schematic SVG, boundary GeoJSON becomes one ordinary
Tier-3 source rendered client-side in the HTML report.

Sub-constituency fidelity (LSOA-level synthesis for intra-seat variety) is a
possible v2.x upgrade, explicitly deferred; the interfaces keep `seat` as the
partition key so it can slot in.

## The pipeline

```
constituency_marginals (derived table, per seat)
   │  1. harmonise categories across E&W / Scotland / NI tables
   ▼
seed joint distribution
   │  2. IPF: fit age×sex × qualification × tenure × activity to marginals
   ▼
integer person counts       (largest-remainder, ported from v1 — it was correct)
   │  3. person synthesis: deal individuals from the fitted joint
   ▼
   │  4. household packing: group persons into households matching
   │     household-size/composition marginals (v1's packer, upgraded to
   │     respect composition tables, not just counts)
   ▼
   │  5. attribute draw: income conditioned on tenure+qualification+region
   │     (modelled from published income stats — documented as modelled,
   │      not census), registration probability by age (from EC research)
   ▼
population/<dataVer>/seat=E14001234/households.parquet
```

All seeded and deterministic: `populationVersion = (dataVersion, seed,
synthCodeVersion)`. Per-seat generation is embarrassingly parallel — Bun
workers, one seat per task; full UK synthesis target: minutes, not hours.

## Validation is part of the feature

`seldon synthesise --check` (and CI at reduced scale) verifies per seat:

- every marginal matches its census table within tolerance (IPF guarantees
  this if it converged — the check catches non-convergence and category
  harmonisation bugs);
- household size distribution matches;
- weighted adult population matches the census adult count, and registered
  population matches the electorate source within a stated band;
- a `synthesis-report.json` per run records fit residuals per seat, surfaced
  by `seldon data status`.

## Skews and forks, re-homed

v1's fork/skew engine (add/remove cohort, age-shift, scale band, tenure
shift, registration rate — deterministic, tested) ports to `src/synth/skew.ts`
operating on Parquet partitions instead of Postgres rows. A fork is
`(populationVersion, ordered skew ops)` — reproducible lineage, same as v1's
design, minus the database. Kept because it's the tool for questions like
"what if 18–24 registration hit 90%?" — which are population what-ifs, not
scenario what-ifs, and the distinction earned its keep in v1's design.

## What the explore experience looks like

Households are for looking at. `seldon explore` runs DuckDB queries over the
population Parquet, filtered with the **same DSL used by scenario rules** —
one predicate language everywhere:

```
seldon explore count   --where "tenure == social && age > 65"
seldon explore sample  --seat "Stroud" --where "!degree && income < 30k" -n 20
seldon explore breakdown --by tenure --seat "Wakefield and Rothwell"
```

After a run, explore gains vote columns (from the run's per-cell
probabilities joined back onto households):

```
seldon explore breakdown --run latest --by ageBand --seat "Stroud"
   → per age band: modelled turnout, party probabilities, expected votes
```

This join is what makes "find out how they might have voted" real: any
household slice → its cells → the run's resolved probabilities.
