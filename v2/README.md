# Seldon v2

This folder is the plan for the second attempt. It starts with an honest audit
of what v1 actually is (not what its README says it is), then lays out the
architecture, data pipeline, model, and CLI for v2, and a phased roadmap.

## The one-paragraph verdict on v1

v1 is a green build around a hollow middle. Typecheck passes, all 29 tests
pass, and `seldon run` prints a convincing forecast — but the forecast is
computed over **650 fictional constituencies** procedurally generated from
hardcoded regional constants (seat names like "Wigan Pier"), the data
pipeline's load stage is a `501 not implemented` stub end to end, the
household synthesis service can never run because nothing ever writes its
input table, and the model never calls the household API at all (the client
dependency is declared but never imported). The backtest scores the model
against data the same module invented, so its 93% "accuracy" is circular.
The two halves of the system — data and model — are fully disconnected.

## What is genuinely good and worth carrying forward

- The **assumptions DSL** (predicate language, rule/effect model, stable
  hashing, the five preset scenarios) — the most finished subsystem.
- The **scenario compiler → log-odds → softmax → Monte Carlo** engine
  structure — real, coherent statistics; only its input data is fake.
- The **IPF household-synthesis algorithm** and the fork/skew engine — correct,
  tested, never fed.
- The **declarative YAML source registry** and the hardened fetcher
  (ONS ArcGIS retry handling, bot-wall User-Agent).
- The **console renderer and HTML report**.
- The types/Zod-schema discipline.

v2 keeps those ideas (and much of that code, ported) and throws away the
three-service architecture, both Postgres databases, and every stub.

## The documents

| Doc | Contents |
| --- | --- |
| [01-audit.md](01-audit.md) | Full audit of v1: what works, what's fake, what's dead |
| [02-vision.md](02-vision.md) | What v2 is for, product principles, definition of done |
| [03-architecture.md](03-architecture.md) | Tech choices, keep/port/drop decisions |
| [04-data-pipeline.md](04-data-pipeline.md) | Declarative sources, fetch→transform→load, real datasets |
| [05-synthesis.md](05-synthesis.md) | Census → marginals → IPF → 28M synthetic households |
| [06-engine.md](06-engine.md) | Model methodology, calibration, honest backtesting |
| [07-cli.md](07-cli.md) | The complete v2 command surface |
| [08-roadmap.md](08-roadmap.md) | Phased milestones with acceptance criteria and open questions |

## Headline decisions (detail in 03)

1. **TypeScript stays; the services go.** v2 is a single Bun/TypeScript CLI.
   No HTTP services, no Postgres, no `seldon up`. Data lives in local
   Parquet/DuckDB files under `data/`.
2. **Real data or no data.** The engine consumes only ingested, checksummed
   datasets: the real 650 constituencies (ONS codes), real 2024 results, real
   census marginals, real electorate counts. The procedural population
   generator survives only as a test fixture, clearly labelled.
3. **End-to-end first, fidelity second.** Milestone 2 produces a real
   headline forecast from real seats with a plain swing model — before
   household synthesis exists. Every later milestone must beat, not break,
   that baseline.
4. **The backtest is the gatekeeper.** Hindcasting 2024 from real 2019
   notionals is a CI-run quality gate, scored against real results. No more
   grading our own homework.
