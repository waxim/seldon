# v2 Vision

## What Seldon v2 is

A CLI that answers one question well and several questions around it:

> **"If a general election were called right now, what would happen?"**

— answered at three zoom levels:

1. **Headline** — seat totals, majority/hung-parliament probabilities, the
   sentence a journalist would write ("Reform largest party, 45 seats short").
2. **Seat** — every one of the real 650 constituencies: projected shares,
   winner, margin, confidence, and what flipped it.
3. **Household** — the SHARP premise, finally real: a synthetic population of
   ~28 million households, statistically faithful to census marginals, each
   resolvable to vote probabilities under the current scenario. You can ask
   "show me renting under-35s in Stroud and how they break" and get an answer
   grounded in real census structure.

And it is a **what-if engine**: scenarios are first-class, buildable,
diffable files. Flip an assumption, re-run, compare.

## Product principles

1. **The CLI is the product.** Every workflow is a `seldon` command. No
   service to boot, no database to install, no `curl`. `git clone && bun
   install && seldon sync && seldon now` must work on a laptop.
2. **Nothing manual.** Data sources are declared in manifests; fetch, clean,
   and load are fully automated and resumable. If a publisher blocks
   automation, the manifest says so and `seldon data recover` stages a manual
   download into the same pipeline — the exception is explicit, never silent.
3. **Real data or clearly-labelled fixture.** The forecast path only ever
   runs on ingested, checksummed, versioned datasets. Synthetic fixtures
   exist for tests and are impossible to mistake for the real thing.
4. **Reproducible by address.** A run is `(dataVersion, assumptionHash,
   modelVersion, seed)` and the same tuple always reproduces the same result.
   v1 promised this and stubbed it; v2 makes it the run store's primary key.
5. **Honest uncertainty, honest accuracy.** Intervals come from calibrated
   noise levels (calibrated on real past elections, documented per release).
   The backtest hindcasts real elections from real priors and its score is
   printed, not hidden. If the model is bad, the CLI says so.
6. **Fast enough to iterate.** A full national run in under ~30 seconds on a
   laptop; a scenario edit → re-run → diff loop measured in seconds, because
   the engine works on demographic cells, not raw households.

## The core loop

```
seldon sync                         # fetch + clean + load everything (idempotent)
seldon synthesise                   # build the 28M-household population (once per data version)

seldon scenario new my-take --from current-polling
seldon scenario set my-take nationalShare.reform=0.28
seldon run my-take                  # → headline + seat table + run id
seldon explore --where "age > 50 && !degree && tenure == social" --run latest
seldon diff <run-a> <run-b>
seldon report latest --html
```

Plus the one-shot: **`seldon now`** — refresh polling, build the
current-polling scenario, run it, print the headline. The demo command and
the reason the project exists.

## Users

Us. This is a hobby-grade psephology lab, not a product with customers. That
cuts scope decisively: no auth, no web UI, no API stability promises, no
multi-user anything. It also raises the bar where it matters: the CLI output
has to be genuinely pleasant to read, because reading it is the whole
experience.

## Explicitly out of scope for v2

- A web frontend or hosted anything (the HTML report is a static file).
- By-election/local-election forecasting (data may be ingested for context,
  but the engine targets a Westminster general election).
- Northern Ireland at full demographic fidelity (see 08-roadmap: NI's 18
  seats get a results-based model first, census-grade later).
- Individual-person microdata realism — we match published marginals; we do
  not attempt (and do not want) to model identifiable real people. Synthetic
  households must stay synthetic: no linkage to actual registers or any
  person-level real data.

## Definition of done for v2.0

- `seldon sync && seldon synthesise && seldon now` works from a clean clone
  with no manual steps (given network access to the publishers).
- The population's marginals match census tables within tolerance per
  constituency, verified by `seldon synthesise --check`.
- `seldon backtest 2024` hindcasts the real 2024 election from real 2019
  notional results and reports calibrated scores (target: beat uniform
  national swing on seat-call accuracy; report Brier and share error).
- All five v1 preset scenarios are re-expressed and produce defensible
  results on real data.
- The v1 tree is deleted.
