# v2 CLI Surface

Principles: every workflow is a command; commands compose; `--json` on
anything that prints; destructive ops confirm; no command exists to manage
infrastructure that no longer exists (`up`/`down`/`status` are gone —
`seldon doctor` absorbs the useful 10%).

## The marquee command

```
seldon now [--refresh-polls] [--iterations N] [--seed N]
```

Refreshes the polling source, regenerates the `current-polling` scenario,
runs the ensemble, prints the headline:

```
  Election called today — poll-of-polls 14 Jul 2026

  Reform largest party — 8 short of a majority
  ████████████████████░░░░░░░░░░░░░░

  PARTY          SEATS   90% RANGE    VOTE
  Reform           318    291–344    29.8%
  Labour           161    140–183    22.1%
  ...

  P(Reform majority)  38%   P(hung parliament)  55%
  vs last week: Reform +11 seats  ·  data 2026-07-14 · scenario a3f2… · seed 1
```

## Full command tree

```
seldon
├── now                                  # the headline (above)
│
├── sync                                 # data fetch+stage+load, everything stale, in order
├── data
│   ├── list / show <id>                 # sources + freshness + checksum state
│   ├── fetch|stage|load [ids…]          # individual stages when debugging
│   ├── verify [--repin]                 # checksums vs MANIFEST.lock
│   ├── recover <id> <file>              # stage a hand-downloaded artefact
│   ├── lineage <table>                  # derived table → sources → versions
│   └── status                           # pipeline health, one screen (v1 lacked this)
│
├── synthesise [--seed N] [--scale 0.1] [--seats …] [--check]
│   └── --check                          # marginal-fidelity validation only
├── population
│   ├── list / show <ver>                # populations + fit reports
│   ├── fork <name> --skew "…" […]       # v1 fork/skew, re-homed (see 05)
│   └── drop <name>
│
├── scenario                             # renamed from `assumptions` — it's what users call it
│   ├── new <name> [--from <preset|scenario>]
│   ├── list / show / edit / clone / set <name> key=value
│   ├── lint <name>                      # DSL field validation, effect sanity ranges
│   └── presets [--write]                # regenerate committed preset JSON from code
│
├── run <scenario> [--population <ver|fork>] [--iterations N] [--seed N] [--report]
├── runs                                 # list stored runs (v1 had no way to list them)
├── diff <run-a> <run-b> [--level seats|regions|national]
├── report [run] [--html] [--level …] [--seat <name|code>]
│
├── explore                              # the household layer (see 05)
│   ├── count|sample|breakdown --where "<dsl>" [--seat …] [--run <id>]
│   └── seat <name|code> [--run <id>]    # one seat, fully unpacked
│
├── backtest [2024] [--null-model] [--iterations N]
├── calibrate                            # fit jitter sigmas to historical elections
├── sim                                  # noise-floor baseline, kept from v1
└── doctor                               # env, disk, data freshness, duckdb health
```

## UX details worth pinning down now

- **Seat addressing**: everywhere a seat is named, accept ONS code or
  fuzzy-matched name (`"stroud"`, `"E14001479"`). One resolver, used by
  `explore`, `report`, `synthesise --seats`.
- **Freshness surfaced, not silent**: any forecast printed from data older
  than its source cadence (polls: days; results: static) gets one dim warning
  line. `seldon now` without network says what it's reusing and how old it is.
- **`latest`** resolves as a run id everywhere a run id is accepted.
- **Exit codes**: 0 ok, 1 user error, 2 pipeline/data failure — scriptable.
- **`--json` everywhere**; the console renderer and the JSON emitter consume
  the same result objects, so they can't drift.
- The HTML report keeps v1's hemicycle + schematic map + distributions, adds
  the null-model comparison and data-provenance footer. Mapbox stays optional.

## Ceremony deliberately removed vs v1

| v1 | v2 |
| --- | --- |
| `seldon up/down/status` + `.env` DB URLs + portless | nothing to boot; `seldon doctor` for health |
| `seldon data process` naming | `stage` (matches the directory and the docs) |
| `seldon snapshot` (stub) | `MANIFEST.lock` + run manifests do it for real |
| `seldon electorate …` (API-backed) | `seldon population …` (local, actually works) |
| `assumptions` | `scenario` |
| `data s3 …` | dropped until needed |
