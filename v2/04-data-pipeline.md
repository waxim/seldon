# v2 Data Pipeline

The part of v1 we most explicitly keep in spirit — remote sources declared in
manifests, fully automated fetch/clean/load, nothing manual — and most
completely rebuild in practice, because v1's load stage was a `501` stub and
its clean stage couldn't read half the government's favourite file formats.

## Stages

```
manifest (YAML, committed)
   │  seldon data fetch
   ▼
raw/          immutable fetched artefacts + recorded checksum + retrieval date
   │  seldon data stage
   ▼
staged/       tidy, typed, documented Parquet — one logical table per output
   │  seldon data load
   ▼
seldon.duckdb loaded source tables + derived tables (marginals, baselines)
   │
MANIFEST.lock updated content hashes → new dataVersion
```

`seldon sync` runs all three stages for everything stale, in dependency
order, resumably. Every stage is idempotent and content-addressed: a source
re-stages only if its raw hash changed, reloads only if its staged hash
changed.

### What each stage fixes from v1

**Fetch** — keep the hardened fetcher (ArcGIS retry, browser UA). Add:
- Record a `sha256` + byte size + retrieval timestamp for every artefact in
  `MANIFEST.lock`. First fetch pins it; `seldon data verify` re-checks;
  `--repin` accepts upstream changes explicitly. (v1 had checksum plumbing
  and zero checksums.)
- `expect:` block in the manifest — content-type, min size, magic bytes — so
  a bot-wall HTML page saved as `data.zip` fails loudly at fetch time, not
  three stages later.
- `needs-url`/`manual: true` sources are first-class: `seldon sync` lists
  them with instructions instead of silently skipping; `seldon data recover
  <id> <file>` stages a hand-downloaded file into the identical pipeline.

**Stage** — replace bespoke stream steps with DuckDB-powered transforms:
- Each manifest names a **staging recipe**: either pure declarative SQL
  (majority case — `read_csv` → select/rename/filter/cast → Parquet) or a
  TypeScript recipe module for the genuinely weird (Democracy Club paginated
  API walker, multi-sheet workbooks).
- Spreadsheets (`.xlsx`, `.xls`, `.ods`) read via a proper library at the
  recipe layer — the three formats that silently no-op'd in v1 become
  ordinary sources.
- Every staged table declares its schema (column names + types) in the
  manifest; staging fails if the output doesn't match. This is the fix for
  v1's "processed output is a raw binary blob and nobody noticed."

**Load** — the stage v1 never had:
- Loading is `CREATE OR REPLACE TABLE src_<id> AS SELECT … FROM staged
  parquet` plus integrity checks declared in the manifest (row counts within
  range, key uniqueness, referential checks like "every constituency code
  joins to `src_constituencies`").
- Derived tables (the model's actual inputs) are built by versioned SQL in
  `src/data/derive/` — see below. `seldon data load` finishes by rebuilding
  any derived table whose inputs changed.

## Source catalogue for v2

v1 declared 40 sources; many existed to feed features that don't exist. v2
starts from the model's needs and works backwards. Tier 1 is the minimum for
a real forecast; Tier 2 enriches the DSL vocabulary; Tier 3 is nice-to-have.

### Tier 1 — required for M1/M2 (real seats, real baseline)

| Source | Publisher | Why |
| --- | --- | --- |
| GE 2024 results (candidacy-level CSV) | UK Parliament election results service | The baseline: real shares per real seat, 2024 ONS codes |
| GE 2019 notional results (2024 boundaries) | Rallings & Thrasher via HoC Library | The backtest prior |
| Westminster constituencies 2024 (names, codes, region lookup) | ONS Open Geography | The 650-seat spine |
| Electorate + turnout by constituency | HoC Library / Electoral Commission | Seat sizes, turnout baselines |
| **National + Scotland/Wales polling series** | Wikipedia polling tables / manual YAML | The "now" in `seldon now` |

Polling is the one genuinely new source class. Plan: a recipe that parses the
Wikipedia "Opinion polling for the next UK general election" tables (flagged
`fragile: true` — scraping), falling back to a committed `polls.yaml` that we
append to by hand when scraping breaks. Poll-of-polls = recency-weighted
average with house-effect shrinkage (see 06).

### Tier 2 — required for M3/M4 (synthesis + demographic rules)

| Source | Publisher | Why |
| --- | --- | --- |
| Census 2021 TS/RM tables **on 2024 constituencies** (E&W): age×sex, tenure, qualifications, economic activity, household composition | ONS/Nomis | Constituency marginals for IPF — ONS publishes census 2021 re-aggregated to new Westminster boundaries, which deletes v1's whole OA→ward→constituency lookup chain for England & Wales |
| Scotland Census 2022 equivalents + datazone→constituency lookup | NRS | Same for Scotland's 57 seats |
| NI Census 2021 headline demographics | NISRA | Coarse marginals for NI's 18 seats |
| Deprivation indices (E/W/S/NI) | MHCLG/WG/SG/NISRA | Seat-level context fields for the DSL (`deprivation`) |
| House prices / income estimates by area | ONS/HMLR | `income`, `housePrice` DSL fields |

### Tier 3 — later or opportunistic

By-election results, local election results, council composition, MRP
publications (calibration cross-checks), candidate lists (Democracy Club,
for "who is actually standing" at election time), party registers/finance.

Everything in v1's catalogue not listed above is dropped until a feature
needs it.

## Derived tables (the model's real inputs)

Built by versioned SQL over loaded sources — this layer replaces v1's
hardcoded `REGIONS` constants:

- `constituencies` — 650 rows: ONS code, name, nation, region, electorate,
  2024 turnout.
- `baseline_shares` — 2024 result shares per seat per party (plus 2019
  notional shares for the backtest).
- `seat_facts` — incumbent party, 2024 margin, winner-runner-up pair,
  deprivation quintile, urban/rural class, red-wall/blue-wall membership
  (defined **by published lists in a committed reference file**, not RNG).
- `constituency_marginals` — the IPF input: age-band × sex, tenure,
  qualification, economic-activity counts per seat.
- `polling_now` — current poll-of-polls with recency weights, by nation.

## Manifest format (sketch)

```yaml
id: ge-results-2024
name: 2024 General Election results
publisher: UK Parliament
licence: OGL-3.0
tier: 1
fetch:
  url: https://electionresults.parliament.uk/general-elections/6/candidacies.csv
  expect: { contentType: text/csv, minBytes: 500_000 }
stage:
  recipe: sql            # default; `module: recipes/foo.ts` for the weird ones
  sql: |
    SELECT constituency_ons_code AS seat, party_abbreviation AS party,
           candidate_vote_count AS votes, ...
    FROM read_csv('{raw}/candidacies.csv')
  schema:
    seat: VARCHAR   # E14000530-style ONS codes
    party: VARCHAR
    votes: BIGINT
load:
  checks:
    - rowCountBetween: [4000, 6000]
    - uniqueKey: [seat, party, candidate]
    - joinsTo: { column: seat, table: src_constituencies_2024, coverage: 1.0 }
```

## Non-negotiables carried from the v1 post-mortem

1. **No source lands without its loader.** A manifest PR must include recipe
   + schema + checks, proven by a golden-fixture test. v1's 40-declared /
   0-loadable ratio must be structurally impossible.
2. **Failure is loud.** No stage may "succeed" by emitting something
   unusable. Schema + checks make silence impossible.
3. **The pipeline owns the last mile.** There is no second process that
   "will pick the files up" — the same command that stages also loads.
4. **Every derived number is traceable** to a source id + dataVersion.
   `seldon data lineage baseline_shares` prints the chain.
