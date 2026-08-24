# The Engine (Psychohistory)

*The engine never meets a voter — only the eighty thousand shapes that
voters make.*

Psychohistory is Seldon's simulation engine: pure compute, owning no
long-lived domain state. It takes a scenario, a question, and a population
(an epoch or fork held by [Radiant](04-population.md)), compiles them into an
executable plan, runs a correlated-shock Monte Carlo across ~650
constituency shards in parallel, and hands aggregated outcomes back to the
[Vault](07-questions.md). This document owns cells, plan compilation, the
uncertainty model and resolution maths, the coordinator/Queues/shard
choreography, the determinism contract and its counter-based RNG, the
performance envelope, and the execution mechanics of backtests and
calibration sweeps — with calibration *policy* explicitly ceded to
[Second Foundation](03-architecture.md).

The engine is a function, not a store: in — a run record from Vault,
scenario + question at exact versions, an epoch/fork id, the committed
calibration config; out — per-seat distributions, outcome artefacts (R2,
headline rows in Vault's D1), and a live progress stream. Everything read
is versioned; everything written is run-tuple-addressable.

## Cells

A **cell** is the set of persons in one seat who share a demographic
signature — the IPF synthesis axes `sex × ageBand × qualification ×
tenure × activity` plus the modelled income band (income is a layer,
not a synthesis axis; [04-population](04-population.md) owns the split).
On signature and context fields cell members are indistinguishable, so
they resolve identically and the engine computes per cell — the
load-bearing v1 trick ([D9](14-decisions.md)): ~28M households and
~50M adults collapse to **~50–200 cells per seat, ~40–80k nationally**,
and a 1,000-iteration national run is seconds of arithmetic, not hours.
Person-level fields inside a band are the one exception, handled by
exact match fractions at plan compile (below).

Cells are derived by Radiant at synthesis time and stored in each seat's
shard DO alongside the households they summarise (schema in
[10-data-model](10-data-model.md)). A cell row carries:

```
cellId        world-scoped, sortable          e.g. uk:E14001156:cell:042
seatId        the shard's constituency
signature     the axis levels                 {sex, ageBand, qual, ...}
weightAdults  persons aged 18+
weightReg     modelled registered voters      (registration layer)
context       seat facts the DSL reads        (region, marginality2024, ...)
```

Question **frames** ([07-questions](07-questions.md)) select cells, not
persons: the frame predicate runs once per signature + context and picks
the weight column. Households never enter the hot path — they exist for
browsing, dossiers, and effect attribution, not simulation.

## Plan compilation

Compilation collapses scenario + question + epoch metadata into a **plan**:
a flat, closed structure a shard can execute with no further lookups. The
compiler runs once per run, inside the coordinator; the plan is cached in
KV under `hash(epochOrForkId, scenarioHash, questionVersion,
engineVersion, referenceDate)` so repeated runs (new seeds, same-day
standing re-runs) skip it.

Compilation steps, in order:

1. **Frame resolution** — the question's frame predicate → per-cell
   effective weights (zero = excluded).
2. **Seat baselines** — per-seat shares from the plan's pinned baseline
   table, an explicit input recorded in the outcome's provenance
   (default: Encyclopedia's `baseline_shares`, the 2024 results;
   backtests pass `ge-2019-notional`), converted to log-odds;
   national/regional targets applied as proportional swing *in log-odds
   space* (the v2 decision — no share-space clamping pathology);
   Scotland and Wales swing against their own polling series.
3. **Rule effects** — every scenario rule's `when` predicate is evaluated
   against every cell signature + context; matching `effect`s fold into
   per-cell, per-party log-odds deltas and a turnout delta. O(rules ×
   cells) once at compile — the DSL never runs inside the iteration loop.
4. **Transfers** — tactical-transfer declarations compile to a per-cell
   row-stochastic transfer matrix (identity where no predicate matches).
5. **Mule events** — each event's onset/magnitude/decay is evaluated at
   the tuple's `referenceDate` to a scalar, then folded into the
   matching cells' effect deltas like a rule.
6. **Shock config** — sigma magnitudes copied in from Second Foundation's
   calibration config (never hand-set; scenario overrides are allowed but
   flagged as a caveat on the outcome).

### Match fractions

Banded and seat-level fields are uniform within a cell; continuous
person-level fields (`age`, `income`) are not — `age > 50` cuts inside
the 50–64 band. Wherever a frame or rule predicate touches a
person-level field, steps 1 and 3 compute each cell's **match
fraction**: the share of its members satisfying the predicate, counted
once from the person rows in the seat shard's SQLite — exact, not
estimated. The predicate then applies weighted by that fraction:

```
effectiveWeight[c] = weight[c] × matchFraction[c]        (frames)
effect[c,p]       += delta[c,p] × matchFraction[c]       (rule effects)
```

So `age > 50 && income < 50k` is evaluable and exact in aggregate;
within a cell, membership is fractional rather than uniform, and
dossiers badge fractional matches as *partial*
([04-population](04-population.md)). `deprivation` needs no fraction:
it is seat-level context — uniform per seat, hence per cell — and the
turnout resolver reads it on exactly that basis.

A plan, abbreviated:

```jsonc
{
  "planHash": "b3a1…",
  "referenceDate": "2026-08-24",
  "resolver": { "id": "vote-intent", "version": 3 },
  "parties": ["lab", "con", "reform", "ld", "green", "snp", "pc", "other"],
  "seats": { "E14001156": { "baseLogOdds": [/* per party */],
                            "region": "north-west" }, /* ×650 */ },
  "cells": { "uk:E14001156:cell:042": {
      "weight": 512, "effect": [0, -0.1, 0.4, 0, 0, 0, 0, 0],
      "turnoutDelta": -0.03, "transfer": null,
      "axes": { "ageBand": "50-64", "qual": "none" /* … */ } } },
  "shocks": { "sigmaNational": 0.055, "sigmaRegional": 0.03,
              "sigmaDemographic": 0.045, "sigmaSeat": 0.02,
              "calibrationVersion": "2026-07-hindcast-3" }
}
```

The plan is sliced per seat before fan-out: a shard receives only its own
baselines and cell effects plus the shared shock config. The engine is
resolver-generic — the plan names a resolver + params; `attitude` and
`turnout` ride the same envelope, but `vote-intent` is the example here.

## Uncertainty: correlated shocks

v1 drew per-cell gaussian jitter i.i.d. and it was **inert**: a seat with
~125 cells averages independent noise down by ~1/√125, so cell jitter
contributed roughly nothing to seat-level variance. Worse, it was the
wrong physics. Real UK polling misses — 2015, 2016, 2019 — were
*correlated demographic errors*: wrong about non-graduates, or renters, or
the old, everywhere at once. i.i.d. noise cannot represent "this
iteration, Reform over-performs with non-graduates nationwide by +x" —
precisely the failure mode that decides elections.

v3 therefore draws, per iteration `i`:

- one **national** shock per party — `η[p,i] ~ N(0, σ_nat)`;
- one **regional** shock per (region × party) — `ρ[r,p,i] ~ N(0, σ_reg)`;
- one **demographic** shock per (party × axis level) — e.g. one draw for
  (`reform`, `qual=none`), applied to *every* matching cell in the
  country — `δ[a,p,i] ~ N(0, σ_dem)`;
- a small **per-seat** residual — `ε[s,p,i] ~ N(0, σ_seat)`.

A demographic shock hits every matching cell identically, so it moves
seats in proportion to their demographic composition — exactly how the
household layer earns its keep in the uncertainty model, and why intervals
widen in the honest direction. The four sigmas come from Second
Foundation's calibration (below), committed with provenance and stamped
into every outcome's footer.

## Resolution maths

For cell `c` in seat `s`, party `p`, iteration `i`:

```
z[c,p,i] = base[s,p]                       seat baseline (log-odds)
         + effect[c,p]                     compiled rules + Mule events
         + η[p,i] + ρ[r(s),p,i]            national + regional shocks
         + Σ_axes δ[a(c),p,i]              demographic shocks (per axis)
         + ε[s,p,i]                        seat residual

P[c,·,i]  = transfer[c] · softmax(z[c,·,i])

votes[s,p,i] = Σ_{c∈s} weight[c] · turnout[c] · P[c,p,i]

turnout[c] = clamp(turnoutBase(c) + turnoutDelta[c], 0, 1)
```

Per-iteration seat votes feed the question's outcome functions: FPTP takes
`argmax_p votes[s,p,i]` per seat per iteration for the seat-count
distribution; shares, crosstabs, and rollups are weighted sums over the
same array. [07-questions](07-questions.md) owns the registry and caveats.

Northern Ireland never reaches this maths in the standing question: the
engine resolves the 632 GB seats demographically, while NI's 18 seats
bypass cell resolution and enter at the seat tally, carried
results-based from 2024 (scenario overrides permitted). The NI parties
(`dup`, `sf`, `alliance`, `uup`, `sdlp`) join the seat-count
distribution and hemicycle under the named caveat `ni-results-based`
([07-questions](07-questions.md)).

**Expected votes, not ballot sampling** — a documented tradeoff carried
from v1/v2. At ~70k voters per seat, multinomial sampling noise is a few
hundred votes of standard deviation — an order of magnitude below the
shock scale — so simulating ballots adds RNG cost and no epistemic
content. It would need revisiting for a world with tiny electorates.

## Choreography: coordinator, Queues, shards

One **coordinator DO** exists per run — Psychohistory's only stateful
object, and its state dies with the run. Cells live in Radiant's shard
DOs; the inner loop runs *inside the shard* ([D2](14-decisions.md)).

```mermaid
sequenceDiagram
    participant V as Vault
    participant C as Coordinator DO (per run)
    participant Q as SIM_TASKS_QUEUE
    participant W as Radiant consumer Worker
    participant S as Shard DO (×650)
    participant T as Terminus (WebSocket)

    V->>C: start(runTuple)
    C->>C: compile plan (cache in KV by planHash)
    C->>C: derive RNG key from run tuple
    C->>Q: enqueue 650 seat tasks (runId, seatId, planSlice ref)
    T-->>C: subscribe /runs/{id}/progress
    loop batched delivery
        Q->>W: task batch
        W->>S: RPC simulateSeat(planSlice, rngKey)
        S->>S: N iterations × cells × parties (local SQLite reads)
        S-->>C: partial: Float32 votes[iteration][party]
        C-->>T: progress {seatsDone, headline convergence}
    end
    C->>C: aggregate; outcome functions + caveats
    C->>V: outcome (D1 headline) + artefacts (R2)
    C-->>T: final {outcomeId}
```

Design points:

- **The queue consumer is a Radiant Worker.** Queues deliver to consumer
  Workers, never to DOs: the sim-task consumer lives in Radiant, drains
  `SIM_TASKS_QUEUE`, and invokes its local shard DOs over RPC; shards
  post partials back to the coordinator via service-binding RPC. So
  Radiant's shards stay bound only inside Radiant and the trust boundary
  holds ([03-architecture](03-architecture.md)).
- **Shared shocks agree by construction.** National, regional, and
  demographic shocks must be identical across all 650 shards within an
  iteration. Rather than shipping precomputed vectors, the coordinator
  ships the RNG key and every shard regenerates the shared lanes
  deterministically (see below) — payloads stay small, values cannot
  disagree.
- **Idempotent tasks.** A task is `(runId, seatId, planHash)`; shard
  compute is deterministic, so Queue redelivery yields byte-identical
  partials and the coordinator dedupes by `seatId`. Failed seats retry
  with backoff, then land in a DLQ; the run fails loudly with partial
  artefacts retained for diagnosis, and a DO alarm marks a stalled run
  failed rather than leaving Terminus hanging.
- **Progress streaming.** The WebSocket emits seats-done counts and a
  running national headline with its convergence band, so Terminus shows
  the forecast settling live ([09-terminus](09-terminus.md)).
- **Per-cell artefact for dossiers.** A standing run also persists a
  `cells` table in its R2 artefacts — mean option distribution, mean
  turnout, and matched rule/Mule ids per cell — and pushes a hot copy
  (one row per cell, keyed by `runId`) to each seat shard's SQLite, so
  dossier leanings join locally with Vault RPC as the fallback
  ([04-population](04-population.md); layout in
  [10-data-model](10-data-model.md)).

## Determinism and the RNG

Determinism is a CI-grade contract: the run tuple
`(worldId, epochOrForkId, scenarioHash, questionVersion, engineVersion,
referenceDate, seed)` determines every per-iteration draw, and (tuple,
iterations) determines every output byte — regardless of Queue batching,
retry order, or which iteration finishes first. `referenceDate` is an
ISO date pinned at launch (defaulting to the launch day); Mule-event
decay and `current-polling` freshness are evaluated against it at
compile time, so re-running a Mule-bearing scenario a week later is a
new tuple, not a different answer to the same one. Iteration count sits
outside the tuple by design: the counter-based RNG makes iteration `i`
identical regardless of N, so raising N extends a run without rewriting
it, and run dedupe compares tuple + iterations. Sequential RNGs break
under parallelism — draw order becomes schedule-dependent — so the engine
uses a **counter-based RNG** (Philox-style): a stateless keyed function

```
u = prf(key, counter)          key     = first 128 bits of
                                         SHA-256(runTuple)
counter = (lane, entityId, iteration, k)
```

where `lane` is a registered stream (`0` national shocks, `1` regional,
`2` demographic, `3` seat residual, `4+` reserved per resolver), `entityId`
identifies the party/region/axis-level/seat within the lane, and `k`
indexes draws (gaussians via Box–Muller over pairs). Any shard can compute
any draw independently — including the shared lanes — with no coordination
and no possibility of divergence: task replays, crash resumption, and
re-runs of the tuple on the same engine version all yield identical
results. A golden-run determinism test is a merge gate from
[P3 onwards](13-roadmap.md); changing the lane registry or draw order is,
by definition, an `engineVersion` bump.

## Performance envelope

Working numbers (UK world, standing election question):

| Quantity | Value |
| --- | --- |
| Seats / shards × parties | 650 × ~8 |
| Cells per seat | ~50–200 (say 125) |
| Iterations (default) | 1,000 |
| Inner loop per shard | 1,000 × 125 × 8 ≈ 1M softmax terms |
| Shard CPU per run | ~20–100 ms with typed arrays |
| Partial size per seat | 1,000 × 8 × 4 B ≈ 32 kB (Float32) |
| National partial volume | 650 × 32 kB ≈ 21 MB into the coordinator |
| Aggregate CPU per run | well under one CPU-minute, over 650 shards |
| Wall-clock target | **< 30 s** end-to-end at 1,000 iterations |

Wall clock is dominated by fan-out and aggregation, not arithmetic — the
maths is embarrassingly parallel and small. The coordinator aggregates
streamingly (running seat summaries + national accumulators) and spills
per-iteration detail to R2 rather than holding partials in DO memory.
Headroom: 10,000 iterations means ~1 s shard CPU and ~210 MB of partials —
still comfortable. Genuinely outsized work (mass calibration sweeps)
escapes to [Containers](03-architecture.md); the default is not to need
them.

## Backtests and calibration — execution mechanics

A backtest is **just a run**: the census-2021 epoch, the baseline table
pinned to `ge-2019-notional` (2019 notional results on 2024 boundaries)
in place of the default `baseline_shares`, a scenario carrying the
*observed* national/regional swing as targets, and a scoring
outcome-function set — seat-call accuracy, seat MAE, per-party share
error, and multi-class Brier over the full party probability vector (not
modal-winner-only, a v1 sin). The pinned baseline rides the ordinary
plan input (step 2) and lands in the outcome's provenance; running 2019
baselines over the census-2021 population is an anachronism, and the
outcome discloses it as such. Three variants execute per backtest, all
through the ordinary coordinator path:

1. **The engine**, full plan;
2. **UNS null** — a degenerate plan: uniform national swing, rules
   disabled, national shock lane only. Always computed, always printed
   beside the engine, which justifies its complexity only by beating it;
3. **Rules-disabled** — full shocks, no demographic rules — showing what
   the demographic layer adds. If it adds nothing, that is a model bug,
   not a reporting choice.

A **calibration sweep** is a batch of hindcast runs over a grid of sigma
vectors `(σ_nat, σ_reg, σ_dem, σ_seat)`, scored for interval coverage —
target ~90% of seats inside their 90% intervals across available election
pairs. A Workflow submits the runs and collects scores; the product is a
candidate calibration config.

### The ownership split with Second Foundation

| Concern | Second Foundation (policy) | Psychohistory (execution) |
| --- | --- | --- |
| Calibration config | Fits, reviews, commits with provenance | Reads it; stamps its version on outcomes |
| Backtests | Chooses endpoints, schedules, sets acceptance thresholds, gates CI | Executes hindcast + null + variant runs and scoring functions |
| Sweeps | Defines grid + coverage targets; publishes the winner | Runs the batch through the coordinator machinery |
| Drift & freshness | Watches, alerts, triggers re-runs on cadence | Serves the re-runs as ordinary runs |

Psychohistory never decides that a sigma is good, when to re-calibrate, or
what score passes — and Second Foundation never computes a softmax. The
engine is the instrument; Second Foundation is the hand that keeps it true.

Related: [03-architecture](03-architecture.md) ·
[04-population](04-population.md) · [06-scenarios](06-scenarios.md) ·
[07-questions](07-questions.md) · [10-data-model](10-data-model.md) ·
[14-decisions](14-decisions.md)
