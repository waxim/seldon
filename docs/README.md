# The Seldon Design

> *The Plan, written down before the first stone of Terminus is laid.*

This folder is the complete design for Seldon v3 — a population-simulation
and prediction engine built natively on the Cloudflare Developer Platform,
operated through a web console, and named throughout for Asimov's
*Foundation*. Nothing described here is built yet; these documents are the
contract the build will be held to, and the [roadmap](13-roadmap.md) is the
order it will be built in.

## Reading order

The documents are numbered for a front-to-back read:

1. **[Vision](01-vision.md)** — what Seldon is and is not, the principles,
   and the honest lessons inherited from the two earlier attempts.
2. **[Lexicon](02-lexicon.md)** — the Foundation naming scheme and the
   canonical domain vocabulary. Read this early; every other doc speaks it.
3. **[Architecture](03-architecture.md)** — the service topology, the
   Cloudflare platform mapping, and the three flows that define the system.
4. **[Population](04-population.md)** — the living replica: worlds, the
   canon and its epochs, synthesis, layers, forks, and the household
   dossier. The heart of the system.
5. **[Datasets](05-datasets.md)** — how published data gets in: manifests,
   the UK source catalogue, the ingestion pipeline, versions and lineage.
6. **[Scenarios](06-scenarios.md)** — the what-if model: demographic rules,
   the predicate DSL, tactical transfers, Mule events, presets.
7. **[Questions](07-questions.md)** — the asking model: instruments,
   frames, resolvers, outcome functions, caveats, and the standing
   election question worked end to end.
8. **[Engine](08-engine.md)** — how a run actually computes: cells,
   correlated shocks, the Monte Carlo ensemble, determinism.
9. **[Terminus](09-terminus.md)** — the website: information architecture,
   every screen, the map and dossier experience, the design language.
10. **[Data model](10-data-model.md)** — where every byte lives: D1
    schemas, shard SQLite, R2 layout, KV, id and binding conventions.
11. **[API](11-api.md)** — Demerzel's public surface, internal RPC,
    realtime contracts, auth and audit.
12. **[Deployment](12-deployment.md)** — the monorepo, infrastructure as
    code, environments, CI/CD, rollout and rollback.
13. **[Roadmap](13-roadmap.md)** — build phases P0–P5, each with
    acceptance criteria that gate the next.
14. **[Decisions](14-decisions.md)** — the ADR ledger: every load-bearing
    choice, its alternatives, and what would make us revisit it.

## Shortcuts by concern

- *"How do I click a house and see everything about it?"* —
  [Population](04-population.md) for the dossier,
  [Terminus](09-terminus.md) for the map experience.
- *"How does the election question get answered?"* —
  [Questions](07-questions.md) end-to-end example, then
  [Engine](08-engine.md).
- *"Why Cloudflare, and how does it hold 28M households?"* —
  [Architecture](03-architecture.md) scale maths,
  [Decisions](14-decisions.md) D1–D4.
- *"What will actually be deployed, and how?"* —
  [Deployment](12-deployment.md).

## House rules for these documents

- **British English**, wrapped near 80 characters.
- Each document opens with a one-line epigraph and a summary paragraph,
  and closes with related links.
- Design is written in the present tense ("Radiant owns the canon");
  anything implementation-phase is explicitly framed as future work.
- One document owns each topic; the others link to it. If two documents
  disagree, the one that owns the topic wins — then fix the other.
- The earlier attempts ([`../LEGACY.md`](../LEGACY.md), [`../v2/`](../v2/))
  are history, not specification.
