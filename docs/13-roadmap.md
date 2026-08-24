# Roadmap

*The Plan permits no skipped crises; each one is earned by surviving the
last.*

This is the build order for Seldon v3: six phases, P0–P5, each delivering
something visibly working in staging and each gated by explicit acceptance
criteria. It is written during the design phase — **nothing below exists
yet**; this document says what gets built, in what order, and what "done"
means at every step. The discipline is inherited from the v2 roadmap
(`v2/08-roadmap.md`), which countered v1's failure mode — scaffolding that
outran implementation — with a standing rule this document keeps: **no
phase starts until the previous phase's acceptance checks pass.**

## Standing rules

1. **The gate rule.** A phase begins only when its predecessor's acceptance
   checks pass — in CI where executable, in staging where observable. Each
   phase's checklist is committed to the repo and ticked with evidence (a
   CI job name, a staging URL, a committed artefact), not by assertion.
2. **Acceptance is executable wherever possible.** A criterion that cannot
   be a CI job or a scripted staging check must name the human review that
   stands in for one.
3. **Real data or clearly-labelled fixture.** No invented numbers presented
   as real — the honesty rule from [01-vision](01-vision.md) applies to
   every phase's demos and tests.
4. **The docs are the contract.** Building something that contradicts these
   design docs requires amending the docs first — material reversals get an
   ADR in [14-decisions](14-decisions.md) before code moves.
5. **Every phase ends with something working end-to-end in staging.** No
   scaffolding-only phases.

## Overview

| Phase | Name | Delivers | Headline gate |
| --- | --- | --- | --- |
| P0 | Streeling | Monorepo, DSL, infra, auth skeleton, console shell | Hello-world through the full stack in staging; CI green |
| P1 | Encyclopedia | Ingestion pipeline, Tier 1 sources, catalogue | 650-seat spine + 2024 baselines queryable, all checksummed |
| P2 | Radiant | Synthesis, shard DOs, epochs, map, dossier | Full-UK epoch passes fidelity; click-a-house works |
| P3 | Psychohistory | Engine, Vault, authoring, standing question | Defensible live headline; determinism test green |
| P4 | Second Foundation | Backtests, UNS null, calibration, drift | Beats UNS; ~90/90 coverage; provenance everywhere |
| P5 | The Mule | Mule events, forks UI, compare, second world | Worked what-ifs as tests; toy world proves the abstraction |

## P0 — Streeling

P0 is named for Streeling University, where psychohistory first left the
blackboard. Foundations: everything later phases stand on.

**Scope**

- Monorepo scaffold: the canonical tree from
  [12-deployment](12-deployment.md); Bun workspaces, Turborepo, Biome,
  TypeScript project references, vitest-pool-workers wiring.
- `packages/foundation` and `packages/dsl` ported as designed — domain
  types, Zod schemas, branded ids, error taxonomy; DSL grammar, parser and
  the **typed field registry from day one** (unknown field = compile
  error), per [06-scenarios](06-scenarios.md).
- Infra bootstrap per [12-deployment](12-deployment.md): Pulumi project
  with `staging` and `production` stacks, wrangler skeletons for all seven
  apps, environments and naming live, `infra:check` in CI.
- Demerzel + Cloudflare Access walking skeleton: Access in front, JWT
  validation, one RPC route through to a stub Radiant.
- Terminus shell deployed: login, empty navigation, `@seldon/client`
  calling Demerzel.
- CI/CD pipelines from [12-deployment](12-deployment.md) operational,
  including PR previews for the DO-free apps.

**Accept**

- Clean clone → `bun install && bun run check` green, locally and in CI.
- Pulumi `staging` stack up; `infra:check` passes.
- A browser session: Access login → Terminus shell → client → Demerzel →
  stub service RPC → response rendered, in staging.
- DSL parses and lints the worked predicate examples from
  [06-scenarios](06-scenarios.md); a misspelt field fails with a typed
  error.
- A PR shows a green pipeline, with preview URLs for the DO-free apps
  (Terminus, Demerzel, Vault) — DO-bearing apps are validated in workerd
  tests and on the continuous staging deploy
  ([12-deployment](12-deployment.md)).

**Risks**

- Account plumbing (Access, tokens, zones) eats the phase → timebox;
  bootstrap steps documented as they happen.
- DSL port grows an evaluator-performance project → port grammar, registry
  and evaluator correctness only; performance work belongs to P3.

## P1 — Encyclopedia

The trust-builder: the data pipeline proven before anything sits on it.

**Scope**

- Ingestion Workflow per [05-datasets](05-datasets.md): fetch → verify →
  stage → load → derive, with checksums, `expect` guards and loud failure.
- Tier 1 sources landed **with loaders and golden-fixture tests**: GE 2024
  results, 2019 notionals, constituency spine, electorate/turnout, polling
  (scraper flagged `fragile`, manual entry as source of truth).
- Derived tables: `constituencies`, `baseline_shares`, `seat_facts`,
  `polling_now`; staged Parquet in R2, registered in R2 Data Catalog.
- Data versions + lineage in D1/R2 (the `MANIFEST.lock` concept).
- Terminus Datasets screens: catalogue, freshness, checksums, lineage
  graph, the "needs a hand" queue with upload/recover.

**Accept**

- The real 650-seat spine and 2024 baselines queryable via R2 SQL;
  `count(constituencies) = 650` as a CI-checked staging assertion.
- Every source checksummed and pinned; re-running ingestion with no
  upstream change is a no-op.
- Golden-fixture tests green for every Tier 1 loader.
- Lineage view traces one derived number (a named seat's 2024 share) back
  to source id + version.
- Killing an in-flight ingestion Workflow and resuming completes cleanly.

**Risks**

- Publisher URLs rot or bot-wall (v1 hit this) → checksummed raw cache in
  R2, `expect` guards, the recover flow, `fragile` flagging.
- Polling scrape brittleness → manual entry is canonical; the scraper only
  proposes.
- Licence surprises on a Tier 1 source → licence metadata is mandatory in
  manifests; a blocked source gets a documented substitute, not silence.

## P2 — Radiant

The replica becomes real: synthesis at full UK scale.

**Scope**

- Tier 2 census sources with cross-nation harmonisation (E&W on 2024
  boundaries, Scotland via datazone lookup, NI coarse) — Encyclopedia work
  in service of synthesis.
- Synthesis Workflow per [04-population](04-population.md): marginals →
  per-seat IPF fan-out over Queues into shard DOs → person synthesis →
  household packing → base layers → per-seat fidelity validation → epoch
  publish (DO SQLite live + R2 Parquet + Iceberg + tile build).
- Density-weighted household placement; PMTiles pipeline.
- Terminus Population screens: map browse nation → street, dossier panel,
  explore mode (DSL filter, count/breakdown/sample), epoch management.

**Accept**

- A full-UK epoch synthesised and published in staging; every seat passes
  marginal fidelity checks within tolerance; the failure list is empty and
  the check is loud when made to fail (fixture test).
- Same `(worldId, populationDataVersion, synthConfig, seed)` → same
  `epochId` and identical shard contents: reproducibility test green.
- Click-a-house at street zoom returns a dossier with per-attribute layer
  badges and provenance, interactively.
- Explore answers count/breakdown over the full epoch at interactive
  speed; measured shard sizes recorded against the scale maths in
  [03-architecture](03-architecture.md), and measured cost per epoch —
  shard row writes especially — recorded against the estimate in
  [12-deployment](12-deployment.md).

**Risks**

- Census category harmonisation across three nations → dedicated module
  with per-nation unit tests; NI stays coarse until it earns fidelity.
- IPF convergence on sparse marginals → residuals quantified per seat;
  raked fallback where marginals conflict (carried from v2).
- Per-seat synthesis exceeds Workers CPU limits → one-seat spike first;
  split synthesis steps; Containers escape hatch exists but the default is
  not to need it.
- Full-UK tile builds outgrow Workers — and the Containers escape hatch
  itself caps at 4 vCPU / 12 GiB / 20 GB per instance
  ([03-architecture](03-architecture.md)) → the tile build is chunked from
  the start: per-region builds merged into one PMTiles archive, never a
  single in-memory pass.

## P3 — Psychohistory

The engine, and the first question answered end-to-end.

**Scope**

- Engine per [08-engine](08-engine.md): plan compilation, correlated-shock
  Monte Carlo with seeded counter-based RNG, per-seat fan-out via the
  coordinator DO and Queues, shard-local resolution over cells,
  aggregation, outcome functions.
- Vault domain per [06-scenarios](06-scenarios.md) and
  [07-questions](07-questions.md): scenarios (hashing, inheritance, lint),
  questions (instruments, frames, resolvers, caveats), runs, outcomes.
- Terminus authoring: scenario editor with live matched-population counts,
  question builder, run queue with live WebSocket progress, outcome views.
- The standing election question wired end-to-end: `current-polling`
  scenario from `polling_now` + canon latest epoch, pinned on the home
  page as the First Crisis.

**Accept**

- A defensible headline (shares + seats + distributions) from real 2024
  baselines and live polling, in staging.
- Determinism as a CI-grade contract: same reproducibility tuple → byte-
  identical outcome, regardless of shard scheduling.
- Live progress streams to Terminus over the coordinator WebSocket for a
  1,000-iteration run; the run completes within the performance envelope
  of [08-engine](08-engine.md).
- Every outcome lists its caveats and carries the full tuple; killed runs
  resume or fail loudly — no zombie coordinators.
- Shock magnitudes are visibly labelled as provisional pending P4.

**Risks**

- Correlated-shock structure is subtle → uncalibrated magnitudes shipped
  behind an explicit "provisional" label; structure validated on fixtures.
- Fan-out tail latency (650 tasks × iterations) → batching per queue
  message; measured early at reduced iteration counts.
- Monte Carlo cost surprises → cells-not-households keeps compute bounded;
  per-run cost tracked in Analytics Engine from the first real run.

## P4 — Second Foundation

The honesty layer: the engine earns the right to be believed.

**Scope**

- Backtest execution: hindcast 2024 from 2019 notionals; UNS null model
  always computed and printed; multi-class Brier; a rules-disabled variant
  showing what the demographic layer adds.
- Calibration: fit shock sigmas for interval coverage; calibration config
  committed with provenance and consumed by the engine (the policy/
  execution split in [08-engine](08-engine.md)).
- Caveat ledger complete in outcomes; provenance footers on every result
  surface in Terminus.
- Drift watch and data-freshness cron; standing-question re-runs on
  cadence; Second Foundation screens in Terminus.

**Accept**

- Engine ≥ UNS on seat calls on the hindcast, recorded as a CI-gated
  baseline score.
- ~90% of seats fall inside 90% intervals on the hindcast; the coverage
  report is committed.
- Calibration config carries provenance (data version, fit date, method)
  and the engine refuses hand-set magnitudes outside it.
- The rules-disabled comparison is published alongside the headline.
- A staleness fixture trips the freshness watch; the alert surfaces in
  Terminus and is never silent.

**Risks**

- 2019 notionals are themselves modelled → labelled as such; backtest
  claims are scoped honestly.
- Overfitting sigmas to a single election → coverage reported, not tuned
  to pass; the limitation stated on the calibration screen.
- Temptation to soften the UNS gate → the gate is binding; if unbeaten,
  the honest number ships and the iteration continues inside P4.

## P5 — The Mule

The unpredictable, made a feature; and proof the design travels.

**Scope**

- Mule events authored and simulated: onset, magnitude, decay, DSL-scoped
  reach, per [06-scenarios](06-scenarios.md).
- Forks and skews UI: fork the canon, layer skews, run against forks; lazy
  per-shard materialisation.
- Run compare (two tuples, diffed outcomes), exports, polish.
- Roadmap-tier AI features behind explicit generative labels: natural-
  language → DSL drafting, dossier-grounded persona interviews — never in
  the statistical path.
- A second world in miniature: a toy fixture country exercising the world
  abstraction (geography levels, parties, electoral system) end-to-end,
  clearly labelled fixture.

**Accept**

- Worked what-if examples committed as tests: named Mule events and skews
  shift the right seats for explicable reasons.
- Fork lineage fully reproducible; a fork run carries its epoch + skew
  chain in the tuple.
- Compare view diffs two runs' headline, seats and distributions.
- The toy world synthesises, answers a question, and renders in Terminus
  with zero UK-specific code paths — and is labelled fixture everywhere.
- Every AI-assisted surface carries its generative label and an off
  switch.

**Risks**

- AI features expand to fill the phase → they are roadmap-tier garnish;
  timeboxed, shipped labelled or cut.
- UK assumptions leak past the world abstraction → world-scoped ids and
  the toy world's CI run are the tripwire.

## Cross-phase standing risks

| Risk | Mitigation |
| --- | --- |
| Scaffolding outruns implementation (v1's failure) | The gate rule; every phase ends working in staging |
| Scope creep into un-designed services | The docs are the contract; new surface area needs an ADR first |
| Platform limits shift under the design (CPU, DO, Queues) | Scale maths re-measured at each phase gate; Containers escape hatch documented, default unused |
| Source publishers rot or block | Checksummed raw cache, `expect` guards, recover flow, manual fallbacks |
| Cost drifts from estimate | Measured cost recorded at P2 and P3 gates against [12-deployment](12-deployment.md) |

Beyond P5 — further worlds, organisation-scale auth, maturing the AI
features — is deliberately out of scope here: it gets designed when P5's
gate has been passed.

Related: [01-vision](01-vision.md) · [03-architecture](03-architecture.md)
· [12-deployment](12-deployment.md) · [14-decisions](14-decisions.md)
