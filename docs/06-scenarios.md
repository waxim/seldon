# Scenarios

*The Plan does not fear the future; it prices it, one written assumption at
a time.*

A scenario is Seldon's unit of "what if": a named, hashable document that
declares a deliberate set of perturbations to the world — share targets,
headwinds, demographic behaviour rules, tactical transfers, and Mule
events. Scenarios are stored by Vault (D1), authored in the
[Terminus](09-terminus.md) scenario editor, and compiled by
[Psychohistory](08-engine.md) into a runnable plan when a run starts. Every
claim a forecast depends on is a line in a scenario document, never a
hidden constant. This doc owns the document model, the predicate DSL
(grammar sketch and field registry), rules and effects, tactical
transfers, Mule events, presets, hashing and versioning, and lint. What a
*question* is belongs to [questions](07-questions.md); how a compiled
scenario executes belongs to [the engine](08-engine.md).

## Scenarios change behaviour; forks change people

Seldon has two kinds of what-if, and they do not overlap:

- A **fork** alters the *population* — add a cohort, age it, change
  registration rates. Forks belong to Radiant; see
  [population](04-population.md).
- A **scenario** alters *behaviour* — how the (unchanged) population leans,
  turns out, and transfers under stated assumptions.

A run selects one of each independently — `youthquake` behaviour against
the canon, or `baseline` behaviour against a `youthquake` fork, or both.
Keeping the axes separate is what makes either answer interpretable.

## The scenario document model

A scenario is a JSON document validated by Zod schemas in
`@seldon/foundation`. The full shape, with every section optional — the
empty scenario is `baseline` and reproduces the epoch's baseline shares:

```jsonc
{
  "world": "uk",
  "name": "reform-surge",              // cosmetic
  "description": "Worked example: …",  // cosmetic
  "tags": ["preset"],                  // cosmetic
  "extends": null,                     // or a parent scenarioHash

  "targets": {                         // share targets, 0..1
    "national": { "reform": 0.28, "lab": 0.24, "con": 0.18 },
    "regional": { "scotland": { "snp": 0.31 } }
  },

  "headwinds": [                       // party momentum, log-odds
    { "party": "con", "delta": -0.20, "scope": "incumbent" }
  ],                                   // scope: everywhere|incumbent|challenger

  "rules": [ /* see Rules and effects */ ],
  "transfers": [ /* see Tactical transfers */ ],
  "muleEvents": [ /* see Mule events */ ],

  "shocks": null                       // override calibrated shock config —
}                                      // normally absent (see below)
```

Targets are *destinations*, not deltas: the engine derives the swing that
moves baseline shares toward them (mechanics in [08](08-engine.md)).
`shocks` overrides the calibrated uncertainty configuration that runs
normally inherit from Second Foundation; overriding it is legal, lint-
flagged, and visible in the hash and in every outcome's provenance —
useful for sensitivity studies, dishonest as a default.

## The predicate DSL

One typed predicate language is used everywhere a subset of people or
seats must be named: scenario rules, transfer gates, Mule event scopes,
[question frames](07-questions.md), and explore mode in
[Terminus](09-terminus.md). It is owned by `@seldon/dsl`; this section is
the design-level sketch.

### Grammar

```ebnf
predicate  = or ;
or         = and , { "||" , and } ;
and        = not , { "&&" , not } ;
not        = [ "!" ] , primary ;
primary    = "(" , predicate , ")" | comparison | field ;
comparison = field , cmp , literal
           | field , "in" , "[" , literal , { "," , literal } , "]" ;
cmp        = "==" | "!=" | "<" | "<=" | ">" | ">=" ;
field      = identifier ;              (* must exist in the registry *)
literal    = number | token | string | boolean ;
number     = digits , [ "k" | "m" ] ;  (* 50k = 50 000 *)
```

Typing rules: enum fields accept `==`, `!=`, `in` against their declared
token set; numeric fields accept the ordered comparators; boolean fields
stand alone (`redWall`) or negated (`!degree`). Enum tokens are bare when
they match `[a-z][a-z0-9-]*`; tokens starting with a digit (age bands) are
quoted. An unknown field or token is a **compile error**, never an empty
match — the v1 footgun where `agee > 50` silently matched nobody (see
[LEGACY.md](../LEGACY.md)) is structurally impossible.

### The field registry

The registry is code (`@seldon/dsl`, typed, versioned with the epoch
schema it describes). The v1 registry, abridged — the axis states what a
field describes; the layer states where it comes from (see
[population](04-population.md) for layer semantics):

| Field | Type | Axis | Values / range | Layer |
| --- | --- | --- | --- | --- |
| `sex` | enum | person | `male`, `female` | census |
| `age` | number | person | 18–105 | census |
| `ageBand` | enum | person | `"18-24"` … `"75+"` | census |
| `qualification` | enum | person | `none`, `level1`, `level2`, `apprenticeship`, `level3`, `level4plus` | census |
| `degree` | boolean | person | sugar for `qualification == level4plus` | census |
| `activity` | enum | person | `employed`, `self-employed`, `unemployed`, `student`, `retired`, `inactive` | census |
| `registered` | boolean | person | on the electoral roll | modelled |
| `income` | number | person | £/year | modelled |
| `tenure` | enum | household | `owned`, `mortgage`, `social-rent`, `private-rent` | census |
| `householdSize` | number | household | 1–8 | census |
| `housePriceBand` | enum | household | quintile bands | modelled |
| `energyBand` | enum | household | `a` … `g` | modelled |
| `deprivation` | number | area | IMD quintile, 1 = most deprived | contextual |
| `urbanRural` | enum | area | `major-urban` … `rural` | contextual |
| `seat` | enum | seat | constituency slug / ONS code | spine |
| `region` | enum | seat | `north-east` … `london` | spine |
| `nation` | enum | seat | `england`, `scotland`, `wales`, `northern-ireland` | spine |
| `marginality2024` | number | seat | winning margin, 0–1 | derived |
| `incumbent` | enum | seat | party id | derived |
| `redWall`, `blueWall` | boolean | seat | committed reference lists in `@seldon/geo` | reference |

Registries are world-scoped: a second world ships its own field set behind
the same grammar.

### Worked predicates

```text
sex == male && age > 50 && !degree && income < 50k
```
The legacy classic: older non-graduate men on lower incomes — a person-
axis predicate that matches cells wholesale.

```text
nation == scotland && ageBand in ["18-24", "25-34"] && tenure == private-rent
```
Young Scottish private renters: person, household, and seat axes composed
in one expression.

```text
redWall && incumbent == lab && marginality2024 < 0.05
```
Purely seat-axis: knife-edge Labour-held Red Wall seats. Matches every
person in them — useful for transfer gates and Mule scopes.

```text
deprivation <= 2 && urbanRural == rural && activity == retired
```
Retired people in deprived rural areas — a contextual-layer predicate that
only works because area attributes are joined onto households.

```text
agee > 50                 → compile error: unknown field "agee"
tenure == "owned" && age  → compile error: bare use of numeric field
```

## Rules and effects

A rule pairs a predicate with an effect on the people it matches:

```jsonc
{
  "id": "nongrad-men-reform",
  "label": "Older non-graduate men on low incomes swing to Reform",
  "when": "sex == male && age > 50 && !degree && income < 50k",
  "effect": {
    "lean": [ { "party": "reform", "delta": 0.35 } ],  // log-odds
    "turnout": 0.03                                     // additive Δp
  }
}
```

Effect semantics, fixed by design:

- **`lean`** — a log-odds delta per party, added to matching cells before
  the softmax. Log-odds, not share points: shifts compose additively,
  never produce negative shares, and mean the same thing in safe seats
  and marginals. As a feel for magnitude: from a 25% baseline, +0.35
  log-odds ≈ +7 points; +1.0 ≈ +23 points.
- **`turnout`** — an additive delta to turnout probability, clamped to
  [0, 1] downstream.
- Multiple matching rules **stack additively** in log-odds. Overlap is
  legal and expected; lint reports worst-case stacking (below).

Resolution mechanics — softmax, expected votes — belong to
[the engine](08-engine.md).

## Tactical transfers

A transfer moves a fraction of one party's resolved support to another,
gated by a predicate (typically seat-axis):

```jsonc
{
  "id": "green-lab-squeeze",
  "from": "green",
  "to": "lab",
  "fraction": 0.35,
  "when": "marginality2024 < 0.06 && incumbent in [con, reform]"
}
```

Semantics: in matching cells, `fraction` of the `from` party's
post-rules probability mass moves to `to`. All transfers apply to the
*pre-transfer* mass, so two transfers out of the same party cannot
compound; the fractions leaving any one party must sum to ≤ 1 (lint
error otherwise). Transfers apply after rules and Mule events — the
stated order matters and is part of the compile contract
([08](08-engine.md)).

## Mule events

A Mule event is a named exogenous shock — the unpredictable individual the
Plan cannot foresee: a leader resigns, a market breaks, a scandal lands.
Its parameter model is `onset` / `magnitude` / `decay` / predicate:

```jsonc
{
  "id": "leader-resigns",
  "name": "Governing party leader resigns",
  "onset": "2026-10-03",
  "magnitude": [
    { "party": "con", "delta": -0.60 },   // peak log-odds at onset
    { "party": "reform", "delta": 0.25 }
  ],
  "decay": { "model": "exponential", "halfLifeDays": 21 },
  "when": "age >= 55"                      // who feels it; omit = everyone
}
```

Because Seldon answers "if the election were held **today**", a Mule event
contributes its *residue at the run date*: zero before `onset`, then
`delta × 2^(−(runDate − onset) / halfLifeDays)` — so a standing question
re-run on cadence shows a shock landing and fading across successive
outcomes without anyone editing the scenario. v1 decay models:
`exponential` (half-life in days) and `none` (a permanent repricing, for
structural events rather than news cycles). Magnitudes may touch several
parties with opposite signs; `when` scopes who feels the shock, in the
same DSL as everything else.

## Composition

A scenario may `extend` exactly one parent (single inheritance, chains
allowed, depth ≤ 5, cycles rejected). Merge semantics are deliberately
dull: scalars and `targets` entries override; `rules`, `transfers`, and
`muleEvents` replace-by-`id`, with `{ "id": "…", "remove": true }` as a
tombstone. A child is its parent with named substitutions — no patch
algebra — and the editor shows the flattened result.

## Presets

Presets carry the legacy library forward as worked examples. Committed
presets are TypeScript definitions in Vault's codebase, published into D1
on deploy — one source of truth, drift impossible (the v2 lesson).

| Preset | Kind | Contents |
| --- | --- | --- |
| `baseline` | committed | the empty scenario; reproduces the epoch's baseline (2024 GE) shares |
| `current-polling` | generated | national/regional targets from Encyclopedia's `polling_now` poll-of-polls; timestamped; regenerated on every polling refresh by Second Foundation |
| `reform-surge` | committed | national target + non-graduate lean rules + Con→Reform transfers |
| `youthquake` | committed | under-30s turnout rules + lean to Lab/Green |
| `progressive-alliance` | committed | Lab/LD/Green transfer lattice gated on marginality |
| `blue-revival` | committed | Con recovery: headwind reversal + shy-response-scale magnitudes |

`current-polling` is generated, not authored: each regeneration is a new
document with a new hash, and the
[standing election question](07-questions.md) pins the newest at run
creation, so every standing outcome names the exact polling snapshot it
believed. Polling mechanics live in [datasets](05-datasets.md).

## Hashing and versioning

Scenarios are content-addressed. `scenarioHash` — the component of the
reproducibility tuple `(worldId, epochOrForkId, scenarioHash,
questionVersion, engineVersion, seed)` — is computed as:

1. Resolve `extends` to the flattened effective document (so editing a
   parent honestly changes every child's identity).
2. Strip **cosmetic** fields: `name`, `description`, `tags`, authorship
   and timestamps. Everything else is semantic. The cosmetic set is a
   designed, documented list — v1 hashed `description`, so fixing a typo
   changed run identity; that class of bug is closed by construction.
3. Canonicalise (sorted keys, normalised numbers, no insignificant
   whitespace) and SHA-256. The console displays the first 16 hex chars.

A scenario *name* in the console is a lineage of documents sharing a
name; a run pins a hash, never a name. Published documents are immutable;
editing one creates a successor with a new hash and recorded lineage.

## Lint

Lint runs live in the Terminus editor and again at save; errors block,
warnings ship but are recorded on the document.

| Code | Level | Check |
| --- | --- | --- |
| E001 | error | unknown field or enum token in a predicate |
| E002 | error | type mismatch (`age == male`, ordered op on enum) |
| E003 | error | transfer fraction outside [0, 1], or fractions leaving one party sum > 1 |
| E004 | error | `extends` cycle, or chain depth > 5 |
| E005 | error | unknown party id, or Mule decay half-life ≤ 0 |
| E006 | error | target share outside [0, 1] |
| W001 | warn | effect sanity: \|lean\| > 1.5 log-odds, or turnout delta > 0.15 |
| W002 | warn | national targets sum outside [0.95, 1.05] |
| W003 | warn | predicate matches zero persons (live count via Radiant) |
| W004 | warn | `shocks` overrides the calibrated configuration |
| W005 | warn | worst-case stacked lean across overlapping rules > 3 log-odds (dry-run compile probe) |

W003 is the honest replacement for silent emptiness: a predicate that
matches nobody is legal (it may match on a fork) but never invisible.

Related: [lexicon](02-lexicon.md) · [architecture](03-architecture.md) ·
[population](04-population.md) · [datasets](05-datasets.md) ·
[questions](07-questions.md) · [engine](08-engine.md) ·
[terminus](09-terminus.md) · [decisions](14-decisions.md)
