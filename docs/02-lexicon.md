# Lexicon

*Before the Plan, the words for the Plan.*

Seldon's naming is Foundation-themed where a name is a landmark — the
services people say aloud every day — and deliberately plain where a name is
a tool. This document is the canonical reference for both: every service and
package name with its rationale, the full domain glossary, the rules that
keep the whimsy under control, and how the scheme extends when new services
or new worlds arrive. It is the doc you open to learn to speak Seldon.
Operational detail — what the services actually do beyond a sentence — lives
in [architecture](03-architecture.md) and the per-domain docs.

## The naming philosophy

Two registers, on purpose:

- **Services are themed.** There are seven of them, they are spoken
  constantly ("Radiant is publishing an epoch", "check the Vault"), and a
  good allusion *teaches* the responsibility. A themed service name must
  earn its keep: the reference should make the service's role easier to
  remember, not harder.
- **Domain nouns stay mostly plain.** Worlds, epochs, layers, questions,
  runs, outcomes — ordinary words, precisely defined, so the system stays
  legible to someone who has never read Asimov. A handful of exceptions
  (canon, dossier, Mule event, Crisis) are themed or elevated because the
  plain alternative was worse; each earns its entry below.

The project itself is **Seldon**, after Hari Seldon, inventor of
psychohistory in Asimov's *Foundation* — the fictional science of predicting
mass behaviour from the statistics of populations. That is, precisely, what
this system attempts at national scale, minus the fiction's certainty and
plus [disclosed caveats](07-questions.md).

## Services

The seven services and why each carries its name. Responsibilities are
one-line summaries; the real definitions live in
[architecture](03-architecture.md).

| Service | Directory | Named for | Responsibility |
| --- | --- | --- | --- |
| **Terminus** | `apps/terminus` | The Foundation's home world | The web console — the entire UI. Browse the replica, manage datasets, scenarios, questions, runs, outcomes. |
| **Demerzel** | `apps/demerzel` | Eto Demerzel, the quiet hand behind the throne | API gateway: auth (validates Cloudflare Access JWTs), routing to services via service bindings, rate limits, audit log. |
| **Radiant** | `apps/radiant` | The Prime Radiant, the device that holds the Plan's equations | The population service. Owns worlds, the canon replica, epochs, forks, layers, cells, and the household dossier. The living model of society. |
| **Encyclopedia** | `apps/encyclopedia` | The Encyclopedia Galactica | The dataset service: source manifests, ingestion workflows (fetch → verify → stage → load → derive), the catalogue, provenance, versioning. |
| **Psychohistory** | `apps/psychohistory` | The science itself | The simulation engine: scenario compilation, correlated-shock Monte Carlo, per-seat fan-out, aggregation. Pure compute; owns no long-lived domain state. |
| **Vault** | `apps/vault` | The Time Vault, where Seldon's predictions are revealed | The asking domain: scenarios, questions, runs, outcomes. The archive of every prediction ever made. |
| **Second Foundation** | `apps/second-foundation` | The hidden guardians who keep the Plan on course | Calibration, backtests, drift monitoring, data-freshness watch, scheduled replica refreshes. Quietly corrects the model. |

Per-name rationale — why each allusion fits:

- **Terminus** is where the Foundation lives and where everything it builds
  becomes visible. The console is where the whole system surfaces: the one
  place a person stands to see the Plan. Home world → home page.
- **Demerzel** operates the Empire from behind the throne, seen by almost no
  one. The gateway is exactly that: every request passes through it, no user
  ever thinks about it. Auth, routing, audit — quiet, total, invisible when
  working.
- **Radiant** — the Prime Radiant holds the equations of the Plan itself.
  Radiant holds the population: the living mathematical model of society
  everything else reads from. The most load-bearing name in the system,
  deliberately given to the most load-bearing service.
- **Encyclopedia** — the Encyclopedia Galactica is the Foundation's cover
  story and its genuine archive of all knowledge. The dataset service is the
  system's archive of all *sources*: what we know, where it came from, which
  version, and whether it can be trusted.
- **Psychohistory** is the science, not a place or a person — fitting for
  the one service that is pure computation and owns no domain state. When
  people say "psychohistory says…", they mean the maths, which is exactly
  right.
- **Vault** — the Time Vault opens on schedule to reveal what Seldon
  predicted. Outcomes are "revealed in the Vault"; the phrase is used in the
  UI. It also archives every prediction ever made, which keeps the system
  honest about its record.
- **Second Foundation** works unseen to correct the Plan's drift from
  reality. Calibration, backtests, and freshness watches do the same:
  nobody interacts with this service directly, but without it the model
  quietly rots. Two words, always; never abbreviate to "SF".

Convention: service names are proper nouns, capitalised in prose, lowercase
in directory and binding names. "Radiant publishes epochs"; `apps/radiant`.

## Packages

Shared packages take functional names — they are tools, not landmarks — with
one earned exception and one hidden codename.

| Package | npm name | Contents |
| --- | --- | --- |
| `packages/foundation` | `@seldon/foundation` | The shared core everything is built on: domain types, Zod schemas, id/branded-type helpers, error taxonomy, constants. |
| `packages/dsl` | `@seldon/dsl` | The predicate DSL: grammar, parser, typed field registry, evaluator, linter. |
| `packages/parties` | `@seldon/parties` | Party registry: canonical parties, colours, aliases, historical mappings, per-world. |
| `packages/geo` | `@seldon/geo` | Geography: ONS codes, admin-level abstraction, lookups, region groupings (Red Wall etc. as committed reference lists). |
| `packages/client` | `@seldon/client` | Typed API client generated from the gateway's route schemas. |
| `packages/ui` | `@seldon/ui` | Terminus design system: components, tokens, the Seldon visual language. |

Notes:

- **`foundation`** is the earned exception: it is simultaneously the plain
  engineering word for "the package everything is built on" and the name of
  the series. The pun costs nothing because the functional reading stands
  alone.
- **`client`** carries the codename **Gaal** — for Gaal Dornick, the
  outsider who travels to Trantor to speak with Seldon. The client is how
  the outside speaks to the system. The codename appears here and nowhere
  else; the package is always referred to as `@seldon/client` in code and
  docs.
- `infra/` is a top-level directory, not a package, and takes no theme —
  see [deployment](12-deployment.md).

## Domain glossary (canonical)

These are the exact words. Use them precisely; do not coin synonyms.

| Term | Meaning |
| --- | --- |
| **World** | One population universe (the UK is the first world, id `uk`). A world = geography model + source catalogue + party registry + electoral systems. Multi-country = more worlds. |
| **Canon** | The one living, continuously maintained replica population of a world. Never edited in place; it advances by epoch. |
| **Epoch** | An immutable version of the canon, produced by a synthesis run over a data version. New data → new epoch. Epochs are addressable and reproducible. |
| **Fork** | A what-if population: an epoch plus an ordered list of **skews** (add/remove cohort, age-shift, scale band, tenure shift, registration rate). Reproducible lineage. |
| **Layer** | An enrichment attached to the population: a dataset extrapolated onto households/persons (e.g. modelled income, energy rating, deprivation context, house-price band). Layers are versioned, documented as modelled vs. published, and show their provenance in the dossier. |
| **Dossier** | Everything the system knows about one household (and its persons): attributes by layer, provenance per attribute, current modelled leanings, question history. What you see when you click a house. |
| **Cell** | A group of persons sharing seat + demographic signature; the engine's unit of computation. |
| **Scenario** | A named, versioned, hashable set of assumptions: national/regional targets, headwinds, demographic rules (DSL predicate → effect), tactical transfers, turnout deltas, and Mule events. |
| **Mule event** | A named exogenous shock in a scenario (leader resigns, economic crash, scandal breaking). Parameterised: onset, magnitude, decay, who it touches (DSL predicate). |
| **Question** | A first-class ask: text + instrument (answer options and their type) + frame (DSL predicate for who is asked) + resolver + outcome functions + caveats. Versioned. |
| **Resolver** | The function family mapping a person/cell (+ scenario effects) to a probability distribution over the instrument's options. |
| **Outcome function** | An aggregation from resolved answers to results: national shares, FPTP seat tally, crosstabs, geography rollups, custom. |
| **Caveat** | A declared, versioned adjustment applied on the way to an outcome (turnout weighting, don't-know reallocation, shy-response correction). Every outcome lists its caveats. No silent adjustments. |
| **Run** | One execution: the reproducibility tuple + status + artefacts. |
| **Outcome** | A run's resolved results, revealed in the Vault. |
| **Crisis** | (Sparing, flavour.) A pinned, standing question the system keeps continuously answered — the standing general-election question is "the First Crisis" on the Terminus home page. |

Rationale for the non-plain entries:

- **Canon** (carried from v1) says more than "current population": it says
  there is exactly one, it is authoritative, and everything else — every
  fork — is measured against it. Borrowed from fiction's own vocabulary for
  "the authoritative version", which is fitting for a system built on a
  novel.
- **Epoch** was chosen over "version" or "snapshot" because the canon is a
  *living* thing that advances through time; an epoch is an era of the
  replica, not a copy of a file.
- **Fork** and **skew** are carried from v1/v2 intact: fork borrows the
  version-control instinct (cheap divergent copy with lineage), skew names
  the individual transform. Both survived the audit as genuinely good.
- **Dossier** beats "profile" or "record" because it implies an assembled
  file *about* a subject, compiled from many sources with provenance — which
  is exactly what it is, per-attribute.
- **Mule event** is the one deep-cut theme in the domain vocabulary: the
  Mule is the individual the Plan could not foresee, and a Mule event is the
  shock the model cannot derive from demographics — it can only be posited
  and parameterised. The allusion carries the epistemology: these are
  *declared* surprises. Capitalised "Mule", lowercase "event".
- **Crisis** is flavour with a strict budget: only pinned standing questions
  earn it, the first being "the First Crisis". Never use it for an ordinary
  question or an alarming drift alert.

## Speaking Seldon

The verbs and idioms that go with the nouns — use these and the prose stays
consistent across docs, UI copy, and commit messages:

- The canon **advances**; epochs are **published**; a synthesis run
  **produces** an epoch.
- Forks are **cut** from an epoch and **skewed**; layers are **attached**
  and **extrapolated**; dossiers are **assembled**, never stored.
- Scenarios are **authored** and **compiled**; questions are **asked** —
  a question is **put to** a population **under** a scenario.
- Runs **execute**; outcomes are **revealed** (in the Vault); caveats are
  **declared** and **applied**, never "baked in".
- Second Foundation **watches** and **corrects**; nothing in the system is
  ever silently adjusted.

And the anti-glossary — legacy or loose terms that must not appear in v3
prose:

| Do not say | Say instead | Why |
| --- | --- | --- |
| assumption set | scenario | The v1/v2 term; retired with the CLI. |
| electorate | population, canon, or fork | v1's noun conflated the people with the register; frames define voters now. |
| SHARP | — (no acronym) | v1's methodology brand; the method evolved past it. |
| jitter | shocks | v3 uncertainty is correlated and calibrated; "jitter" implies the inert i.i.d. noise the audit condemned. |
| snapshot (of population) | epoch | "Snapshot" undersells immutability and addressability. |
| the database of people | the canon / the replica | People are synthetic; the framing matters. |
| simulation (as a noun for one execution) | run | "Simulation" is the activity; a run is the addressable unit. |

## Theming rules — the whimsy budget

The whole budget, exhaustively:

1. **Service names** (the seven above) and any future service named under
   the extension rules below.
2. **The themed domain terms** listed in the glossary — no new ones without
   an entry here.
3. **One epigraph per doc**: a single italic line under the title, original
   and themed. Never a direct Asimov quote — we write our own lines.
4. **Phase names** on the [roadmap](13-roadmap.md) (Streeling, The Mule,
   …), which follow the same one-allusion-per-name discipline.

Everything else — engineering prose, error messages, API routes, schema and
binding names, comments — stays precise and unwinking. A reader debugging at
2 a.m. should never need the novels to understand a sentence. British
English throughout: synthesise, artefact, colour, catalogue.

## How naming extends

**A new service** gets a Foundation-themed name, admitted only if it passes
all four tests:

1. The allusion genuinely describes the responsibility (as Demerzel does
   the gateway) — the name must teach, not decorate.
2. One or two words, pronounceable, distinct from every existing name at a
   glance and in speech.
3. It survives the 2 a.m. test: prefixed with "the X service is down", it
   reads as infrastructure, not a joke.
4. It is recorded here, in this doc, with its rationale, before the
   directory is created.

Candidate names are deliberately not stockpiled: a bench of clever unused
names invites services that exist to use them.

**A new world** takes a plain, lowercase, stable id — `uk` first; a future
country would follow the same shape (short, unambiguous, ISO-adjacent).
Worlds are never themed: they name real places and real populations, and
the plain register signals that. World display names are the ordinary
English name of the place. Everything inside a world (epochs, forks,
layers) is world-scoped by id — formats in
[the data model](10-data-model.md).

**A new domain noun** defaults to plain English. A themed or elevated term
must earn its place the way the existing exceptions did: it is used
constantly, the plain alternative is ambiguous or misleading, and the
chosen word teaches its own meaning. It is not a domain noun until it has a
row in the glossary above.

**Infrastructure names** (bindings, buckets, queues, databases) are never
themed beyond carrying their service's name as a prefix; conventions live
in [the data model](10-data-model.md) and
[deployment](12-deployment.md).

Related: [vision](01-vision.md) · [architecture](03-architecture.md) ·
[population](04-population.md) · [scenarios](06-scenarios.md) ·
[questions](07-questions.md) · [roadmap](13-roadmap.md)
