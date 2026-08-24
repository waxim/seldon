# v2 Roadmap

Sequenced so that something real works at the end of every milestone, and the
data pipeline is proven before anything fancy sits on it. v1's core failure
mode — scaffolding that outran implementation — is countered by a standing
rule: **no milestone starts until the previous one's acceptance checks pass
in CI.**

## M0 — Skeleton + spike (small)

- `v2` implementation lives at repo root under `src/` (v1 apps/packages stay
  untouched until M6 deletes them).
- Bun + Biome + commander skeleton; `seldon --help`, `seldon doctor`.
- **DuckDB-under-Bun spike**: load a CSV, write/read Parquet, 10M-row
  aggregate. Outcome recorded in `03-architecture.md` (DuckDB vs `bun:sqlite`
  fallback).
- Port `core/` (types+schemas), `logger`, config loading.

**Accept:** `seldon doctor` green in CI; storage decision written down.

## M1 — Data pipeline, Tier 1 sources (the trust-builder)

- Manifest schema, registry, fetch (ported hardening + checksums + `expect`
  guards), stage (SQL recipes + module recipes), load (checks + derived
  tables), `MANIFEST.lock`, `sync`, `verify`, `recover`, `status`, `lineage`.
- Tier 1 sources landed **with loaders and golden-fixture tests**: GE 2024
  results, 2019 notionals, constituency spine, electorate/turnout, polling
  (scraper + manual-YAML fallback).
- Derived: `constituencies`, `baseline_shares`, `seat_facts`, `polling_now`.

**Accept:** `seldon sync` from clean clone → loaded warehouse; every source
checksummed; golden tests green; `SELECT count(*) FROM constituencies` = 650.

## M2 — First real forecast (the milestone that matters)

- Engine port: scenario compile (minus demographic rules), Monte Carlo,
  aggregate, winner, run store, console render, `runs`/`diff`/`report`.
- Swing model on real baselines; Scotland/Wales polling layers; NI
  results-based model.
- `scenario` commands + hashing; `current-polling` preset; **`seldon now`**.

**Accept:** `seldon now` prints a defensible headline from real 2024 baselines
+ live polling; determinism test (same tuple → same result); run store
round-trips.

## M3 — Synthesis + explore (SHARP becomes real)

- Tier 2 census sources (E&W on 2024 constituencies; Scotland via lookup; NI
  coarse) with category harmonisation.
- IPF + person synthesis + household packing + attribute draw, parallel per
  seat; `--scale` for dev; `--check` fidelity validation.
- `population` commands incl. ported fork/skew.
- `explore count/sample/breakdown/seat` over Parquet with the DSL.

**Accept:** full-UK synthesis on a laptop in minutes; every seat passes
marginal checks; `explore` answers sub-second at full scale (CI runs reduced
scale).

## M4 — Demographic rules on real cells

- Cells built from the real population; DSL ported with field registry +
  `scenario lint`; new context fields (deprivation, activity, urbanRural,
  real redWall/blueWall lists).
- Effects/tactical/turnout logic ported; correlated demographic shocks
  replace inert cell jitter.
- Presets re-expressed and recalibrated against real demographics;
  `explore --run` joins run probabilities back onto households.

**Accept:** rule scenarios shift the right seats for explicable reasons
(worked examples committed as tests); disabled-rules run ≡ M2 swing model.

## M5 — Honesty layer

- Real backtest (2024 from 2019 notionals) + UNS null model + multi-class
  Brier; CI gate at recorded baseline.
- `seldon calibrate` fits jitter sigmas; calibration config committed with
  provenance; interval-coverage report.
- Swing-space decision (share vs log-odds) settled by backtest, recorded.

**Accept:** engine ≥ UNS on seat calls; ~90% of seats inside 90% intervals on
the hindcast; report footers carry calibration provenance.

## M6 — Polish + v1 removal

- HTML report (hemicycle, map, distributions, null-model panel, provenance).
- `--json` everywhere, exit codes, seat fuzzy-resolver, freshness warnings.
- Docs rewritten from real behaviour. **Delete `apps/`, `packages/`, old
  `data/sources/`** — the README describes only things that exist.

**Accept:** the v2.0 definition of done in `02-vision.md`, checked line by
line.

---

## Standing risks

| Risk | Mitigation |
| --- | --- |
| DuckDB/Bun binding friction | M0 spike; `bun:sqlite` fallback behind the store interface |
| Publisher URLs rot / block bots (v1's fetch already hit this) | checksummed raw cache, `expect` guards, `recover` flow, `fragile: true` flagging, optional S3 mirror revival |
| Wikipedia polling scrape brittleness | manual `polls.yaml` fallback is the source of truth; scraper only appends |
| Census category harmonisation across E&W/Scotland/NI | dedicated harmonisation module with unit tests per nation; NI stays coarse until it earns fidelity |
| IPF convergence on sparse marginals | ported v1 algorithm is tested; `--check` quantifies residuals per seat; fall back to raked seed distribution where marginals conflict |
| Scope creep back into three-service land | architecture doc's drop-ledger is binding; any new service/database needs a written decision |

## Open questions (parked, non-blocking — current defaults in bold)

1. **Polling ingestion**: **scrape Wikipedia with manual-YAML fallback** vs
   manual-only. Default chosen for automation-first; revisit if the scraper
   burns more time than it saves.
2. **Population scale**: **1:1 (~28M households)** vs weighted 10% sample.
   1:1 costs ~single-digit GB of Parquet and makes `explore` honest;
   `--scale` exists for dev either way.
3. **NI fidelity**: results-based model in v2.0 (chosen); census-grade NI in
   v2.x if anyone cares about intra-NI dynamics.
4. **Monorepo shape**: single package (chosen) — revisit only if something
   needs independent publishing.
5. **v1 preset politics**: the five presets' numbers were written for the
   invented country; recalibrating them against real data (M4) may change
   their stories noticeably. Fine — but flagging that "reform-surge" et al.
   will not produce v1's numbers.
