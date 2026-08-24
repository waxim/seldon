# Decisions ledger

*An epoch records what the population was; a decision records what we were
thinking.*

Twelve architecture decision records, D1–D12, in the classic short form:
Context, Decision, Consequences, and — where sensible — the triggers that
would reopen the question. These are the choices the rest of the design
leans on; the documents linked from each ADR carry the detail. A decision
here is settled for the design phase: reopening one requires hitting its
revisit trigger, not merely preferring an alternative.

## D1 — Cloudflare-native over self-hosted

**Context.** v1 self-hosted two services and two Postgres databases for an
audience of one; v2 retreated to a single local process. The v3 brief is a
real website, always-on standing predictions, and a small team with zero
appetite for operations. The Cloudflare platform's primitives map uncannily
well onto the domain: a Durable Object per constituency, Workflows for
pipelines, R2 for artefacts, cron for the watch.

**Decision.** Every service is a Worker on the Cloudflare Developer
Platform; state lives in the platform's stores (DO SQLite, D1, R2, KV);
orchestration uses Queues and Workflows. No servers anywhere.

**Consequences.** Operational load approaches zero; the site is fast from
everywhere; scaling is the platform's problem. The cost is vendor coupling
— accepted, and mitigated by keeping the domain in clean, platform-free
packages (`@seldon/foundation`, `@seldon/dsl`, …) with the platform touched
only at service edges.

**Revisit if** a platform limit (CPU time, DO storage, Workflows step
budget) blocks a roadmap phase's acceptance criteria, or pricing shifts
materially against the workload.

## D2 — A Durable Object per constituency

**Context.** ~28M households cannot live in one relational database on this
platform, and hauling population rows to compute would dominate run cost.
The domain hands us a natural partition key: the constituency (~650 for the
UK), which is also the unit of electoral aggregation.

**Decision.** Radiant shards the population as one SQLite-backed DO per
constituency per world, each holding its slice of households, persons, and
cells. Simulation tasks are delivered to the shard; cells never leave the
object that stores them.

**Consequences.** Data locality and a natural 650-wide parallelism; honest
scale maths (~43k households per shard, tens of MB — far under the 10 GB
limit; see [03-architecture](03-architecture.md)). Cross-seat queries must
fan out or use the analytics plane (D4). A boundary review means a new
geography model version, not an in-place reshuffle. The alternative — a
flat D1 population table — was rejected on size and on the absence of
fan-out parallelism.

**Revisit if** a future world's districts are much denser than UK seats; the
remedy is sharding at a lower admin level, not abandoning the pattern.

## D3 — The D1 vs DO SQLite split rule

**Context.** The platform offers two relational stores and it is easy to
misuse either: D1 for hot per-seat reads (wrong side of the network) or DO
SQLite for cross-cutting metadata (wrong side of addressability).

**Decision.** One sentence, applied everywhere: relational metadata goes to
per-service D1; population rows and anything read at simulation speed go to
DO SQLite, co-located with compute; bulk immutable artefacts and analytics
go to R2; caches go to KV.

**Consequences.** Each service owns its own small, queryable D1; no
cross-service database reach-ins; performance and cost stay predictable.
Workloads that fall between the stools (relational questions over the whole
population) are explicitly the analytics plane's job, not a reason to bend
the rule. Schemas: [10-data-model](10-data-model.md).

**Revisit if** a recurring workload has no good home under the rule — that
is a signal to extend the rule, in this ledger, not to improvise.

## D4 — R2 + Iceberg / R2 SQL as the analytics plane

**Context.** v2 bet on DuckDB for national crosstabs and population
exploration. There is no DuckDB in the Workers runtime, and streaming
epoch-scale Parquet through Workers to answer analytical queries wastes CPU
and time.

**Decision.** Epoch snapshots and staged datasets are registered as Apache
Iceberg tables in R2 Data Catalog; heavy analytical queries (national
crosstabs, layer validation) run via R2 SQL. This inherits DuckDB's v2 role
without leaving the platform.

**Consequences.** Analytics never touches the shards or the request path;
zero egress on the data; snapshots double as the archive format. R2 SQL is
a young product — accepted, because the fallback is straightforward:
precomputed aggregates built by Workflows into D1/KV, or a
Container-hosted query engine over the same Iceberg tables.

**Revisit if** R2 SQL's feature set or performance cannot carry the P2
layer-validation workload; fall back as above without changing the storage
layout.

## D5 — Workflows for orchestration

**Context.** Ingestion, epoch synthesis, run execution, and calibration
sweeps are multi-step, long-running, and failure-prone. v1's lesson is that
hand-rolled pipeline state machines are where reliability goes to die.

**Decision.** Cloudflare Workflows own durable multi-step orchestration;
Queues remain for wide fan-out *within* a step. The run's latency-sensitive
inner loop stays in the coordinator DO (which also serves the progress
WebSocket), with a Workflow as its durable envelope.

**Consequences.** Retries and resumability come from the platform; step
state is observable rather than reconstructed from logs. Coupling to a
newer platform product — accepted under D1's general posture.

**Revisit if** Workflows limits (step count, duration, payload size) bind
during full-UK synthesis; the envelope can decompose into chained
workflows before anything is hand-rolled.

## D6 — TypeScript everywhere, including IaC

**Context.** The brief requires TypeScript wherever possible. Split-language
infrastructure (HCL alongside app code) is where naming conventions and
constants quietly fork.

**Decision.** TypeScript end-to-end: services, packages, tooling — and
infrastructure as code in Pulumi TypeScript, with `wrangler.jsonc` owning
everything Worker-attached. One language, one type system, shared
constants (binding names, resource naming) between app and infra.

**Consequences.** Contributors need one toolchain; resource names are typed
references, not stringly-typed conventions. Terraform is noted as the
equivalent alternative if Pulumi becomes untenable. Detail:
[12-deployment](12-deployment.md).

**Revisit if** Pulumi's Cloudflare provider lags a resource the design
needs; escape hatches are the raw API from TypeScript or the Terraform
provider bridge, before any move off TypeScript.

## D7 — No Postgres, no Hyperdrive

**Context.** v1 ran two Postgres databases with PostGIS to serve an
integration that was never built; they gated the product and produced most
of its operational drag. The platform now covers every storage need the
design has (D3).

**Decision.** No Postgres anywhere, and therefore no Hyperdrive —
deliberately listed as *not used* in the platform mapping.

**Consequences.** Nothing to provision, patch, or connection-pool. No
PostGIS means no runtime spatial SQL: geometry work is precomputed —
PMTiles for rendering, `@seldon/geo` lookups for containment — which the
map design ([09-terminus](09-terminus.md)) is built around.

**Revisit if** a workload genuinely needs server-side spatial joins beyond
precomputation; that claim gets challenged hard before any database is
provisioned.

## D8 — Cloudflare Access for auth in v1

**Context.** The team is small; a user database is liability and work with
no product value at this stage. The platform's Zero Trust layer already
authenticates at the edge.

**Decision.** Cloudflare Access fronts Terminus and the API. Demerzel
validates the Access JWT on every request and maps identity to a coarse
role: owner, operator, or viewer. No user database, no password storage,
no session code. Audit log in D1.

**Consequences.** Authentication is configuration, not code; the org-ready
path is Access with an IdP behind it (SSO), unchanged application-side.
Roles are deliberately coarse; fine-grained authorisation is future work
behind Demerzel. Service-to-service calls need no tokens at all — bindings
are the boundary. Detail: [11-api](11-api.md).

**Revisit if** external or multi-tenant users arrive; that requires a real
authorisation model, not more Access policies.

## D9 — Cells stay the engine's unit of computation

**Context.** The one load-bearing trick carried from legacy: persons who
share a seat and a demographic signature resolve identically, so ~50M
adults collapse to ~40–80k cells and population-scale simulation costs
seconds, not hours.

**Decision.** Psychohistory computes exclusively on cells. Households and
persons exist for browsing, dossiers, and layer effects; scenario rules
compile to per-cell effect sums before any iteration runs.

**Consequences.** Run cost is independent of population size (see the scale
maths in [03-architecture](03-architecture.md)). The granularity of
resolution is bounded by the signature: person-level idiosyncrasy within a
cell is not representable, which is documented rather than hidden. Changing
the signature is an epoch-level derivation change, not a runtime knob.
Detail: [08-engine](08-engine.md).

**Revisit if** a resolver genuinely needs person-level state (for example
panel-style memory across runs); sub-cell sampling would be evaluated
before abandoning cells.

## D10 — Synthetic-only populations

**Context.** The replica must be rich enough to click a house and see a
believable dossier, without ever modelling a real person. Fidelity and
ethics point the same way: published aggregate marginals are both the
honest ceiling of what we know and the hard floor of what we touch.

**Decision.** Households and persons are synthetic, fitted to published
aggregate marginals only. No linkage to registers or any person-level real
data; map placement is density-weighted and plausible, never a real
address. The honest fidelity claim: statistically indistinguishable from
the UK at the published level of detail.

**Consequences.** No re-identification risk to manage in the population
itself; the privacy stance is a design property, not a compliance layer.
Every dossier attribute carries its layer badge and provenance so modelled
values are never mistaken for observed ones. Full treatment:
[04-population](04-population.md).

**Revisit — never for weakening.** The line only moves in the direction of
caution; newly published data at finer granularity triggers a
disclosure-risk review before use.

## D11 — Design-first: the docs are the contract

**Context.** The brief names this a design phase, in the repository that
becomes the monorepo. The v1/v2 pattern of building first and documenting
the survivors produced code that gated the product and docs that trailed
it.

**Decision.** This design ships before any code. The documents in `docs/`
are the contract the build phases ([13-roadmap](13-roadmap.md)) are
accepted against; where implementation reality disagrees, the doc is
amended by PR before the code diverges.

**Consequences.** Reviewable architecture before spend; naming, boundaries,
and schemas agreed while they are cheap to change. The risk is unvalidated
assumptions — mitigated by naming spikes in the roadmap and by acceptance
criteria that test the design's claims (fidelity tolerances, determinism,
scale maths).

**Revisit** — not applicable: the decision self-expires as each build phase
validates or amends its slice of the design.

## D12 — Web console over CLI

**Context.** The brief is explicit: no CLI as the product. v1's
CLI-as-product was its deepest structural mistake — it capped the audience
at one operator and hid the system's best ideas behind flags.

**Decision.** Terminus is the product: every workflow — browsing, ingesting,
authoring, running, comparing — has a first-class UI. A thin `seldon` CLI
may exist later for operational convenience only, wrapping
`@seldon/client`, and is explicitly non-product.

**Consequences.** Operational tasks become designed flows, not shell
incantations: checksum re-pinning is an explicit console action, manual
sources surface in the "needs a hand" queue. The API-first gateway keeps a
future ops CLI cheap without ever making it load-bearing. Detail:
[09-terminus](09-terminus.md).

**Revisit if** operators need scripting or automation hooks; the answer is
the ops CLI (or plain API tokens), never a return of the CLI as the
product surface.

Related: [01-vision](01-vision.md) · [03-architecture](03-architecture.md) ·
[04-population](04-population.md) · [08-engine](08-engine.md) ·
[10-data-model](10-data-model.md) · [11-api](11-api.md) ·
[12-deployment](12-deployment.md) · [13-roadmap](13-roadmap.md)
