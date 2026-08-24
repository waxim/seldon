# v2 Engine

The v1 engine's shape survives — cells, compiled scenarios, log-odds effects,
softmax resolution, Monte Carlo ensemble, FPTP tally — because the audit
found the maths genuinely sound. What changes: every input becomes real, the
uncertainty model gets calibrated instead of hand-set, and the backtest stops
grading its own homework.

## Data flow

```
constituencies + baseline_shares + seat_facts     (derived tables — real)
population/<ver>/ Parquet                          (synthesised households — real marginals)
        │ group by (seat, sex, ageBand, qualification, tenure, incomeBand, activity)
        ▼
cells: ~50–200 per seat, ~40–80k national          (weight = registered adults)
        │ + scenario (assumption set)
        ▼
compiled plan: per-seat adjusted baselines (log-odds), per-cell rule effects,
               turnout deltas, tactical transfers   (v1 compiler, ported)
        │ × N iterations
        ▼
Monte Carlo: layered jitter → softmax → expected votes → FPTP
        ▼
RunResult: seat calls + distributions + probabilities  (Parquet + JSON in runs/)
```

The cell layer is the load-bearing trick and it's why household scale is
free at run time: 28M households collapse to tens of thousands of cells once,
at synthesis load; a 1,000-iteration national run stays in seconds.

## Baseline and swing

- Baseline = real 2024 shares per seat (`baseline_shares`), not v1's invented
  `drawBaseline`.
- National/regional targets from the scenario (or from `polling_now` for
  `seldon now`) applied as **proportional-ish swing in log-odds space** with
  the share-space UNS result as a cross-check — v1 applied swing in share
  space then clamped negatives at a floor; log-odds swing avoids the
  negative-share pathology natively. Decision recorded here: implement both,
  backtest both, keep the winner (M5 acceptance criterion).
- Scotland and Wales get their own polling series and swing layers — a
  UK-national-only swing misses the SNP/Plaid dynamics that decide dozens of
  seats.
- NI phase 1: no demographic model; seats forecast from 2024 results +
  optional scenario overrides (NI polling is sparse and its party system
  disjoint). Honest and contained; upgrade path in the roadmap.

## The uncertainty model, fixed

v1's three jitter layers had one real problem and one dishonesty:

1. **Cell jitter was inert** — drawn i.i.d. per cell, it averaged away at
   seat level. v2 replaces it with **correlated demographic shocks**: per
   iteration, draw one shock per (party × demographic axis level) — e.g. "this
   iteration, Reform over-performs with non-graduates everywhere by +x" — and
   apply it to every matching cell. This is the polling-error structure that
   actually happens (2015, 2016, 2019 misses were correlated demographic
   errors, not seat-local noise), it makes the household layer genuinely
   matter to seat outcomes, and it widens intervals in the honest direction.
2. **Jitter magnitudes were hand-set constants.** v2 calibrates them: choose
   the (national, regional, demographic, constituency) sigma vector that
   makes historical hindcasts well-calibrated (e.g. ~90% of seats fall inside
   their predicted 90% intervals across 2019→2024 and available prior pairs).
   The calibration run is a CLI command (`seldon calibrate`), its output is a
   committed config with provenance, and the report footer states it.

Expected-votes resolution (no ballot sampling) is kept — documented tradeoff,
correct at 70k-voter scale.

## Scenarios

Ported wholesale from `packages/assumptions`, with upgrades:

- **Field-name validation** — the DSL gets a typed field registry; unknown
  identifiers are compile errors, killing v1's silent-typo footgun
  (`agee > 50` matching nobody). `seldon scenario lint` runs it standalone.
- **New context fields** from real data: `deprivation`, `urbanRural`,
  `activity`, `housePriceBand`, `region`/`nation` (real), `marginality2024`,
  `incumbent`, `redWall`/`blueWall` (from committed reference lists, not RNG).
- **Presets become code-generated** — one source of truth in
  `src/scenario/presets/`, JSON emitted by `seldon scenario presets --write`;
  drift impossible.
- **A new first-class preset: `current-polling`** — generated from
  `polling_now`, timestamped, and the input to `seldon now`. This is the
  scenario that answers "if an election were called right now".
- Hashing keeps v1's stable-stringify SHA-256 design; `description` moves to
  the excluded-cosmetic set (v1 bug: editing a description changed the run
  identity).

## The backtest, made honest

- **Real endpoints:** hindcast the real 2024 election from real 2019 notional
  results (both ingested Tier-1 sources). Apply the actual observed national/
  regional swing as the target; score seat calls, seat MAE, per-party share
  error, and a proper multi-class Brier over the full party probability
  vector (v1's was modal-winner-only).
- **UNS is the null model.** The backtest always reports plain uniform
  national swing alongside the engine. The engine justifies its complexity
  only by beating it — this comparison is printed, not buried.
- **The demographic layer must earn its keep:** a backtest variant with rules
  disabled shows what the household machinery adds. If the answer is ever
  "nothing", the roadmap says so and we fix the model, not the metric.
- **CI gate:** reduced-iteration backtest runs on every PR; seat-call
  accuracy below the recorded baseline fails the build.
- Later (v2.x): widen the library — 2019 from 2017, 2017 from 2015, on
  respective-era boundaries — for calibration depth.

## Run store

Runs are files: `runs/<runId>/manifest.json` (the reproducibility tuple,
scenario snapshot, headline numbers) + `seats.parquet` (per-seat, per-party
distributions) + `cells.parquet` (per-cell resolved probabilities — what
`seldon explore --run` joins against). `latest` is a symlink. `seldon diff`
reads two manifests + seat tables. No database, no dead HTTP layer.
