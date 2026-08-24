# API

*Every question enters by one door, and the doorkeeper writes down its
name.*

Demerzel is Seldon's one public API: a gateway Worker that validates
Cloudflare Access identity, enforces roles and rate limits, validates
every payload against shared Zod schemas, routes to the internal services
over typed Workers RPC, and records an audit trail in D1. The surface is
REST + JSON, described by OpenAPI generated from the same route schemas
that generate `@seldon/client` — the only way Terminus ever talks to the
system. This document owns the public resource surface, the error
taxonomy, the internal RPC pattern, the WebSocket contract for run
progress, auth, and the versioning policy. Storage schemas live in
[10-data-model](10-data-model.md); Terminus's consumption of all this in
[09-terminus](09-terminus.md).

## Conventions

- **JSON only**, UTF-8, timestamps ISO-8601 UTC, camelCase wire fields.
- **Ids are branded** and, where they name a row in the replica,
  world-scoped (`uk:E14001156:hh:00b3c1`, `run_01j9dq3zx8k7…` — the four
  id families are owned by [10-data-model](10-data-model.md)), so a single
  resource is addressable without a world prefix. Convention: *collections* live under
  `/worlds/{worldId}/…`; *single resources* are fetched top-level by their
  fully qualified id (`/households/{householdId}/dossier`). Vault documents
  (scenarios, questions, runs, outcomes) are top-level collections whose
  documents name their world internally.
- **Pagination** is cursor-based: `?limit=&cursor=` in, `{ items,
  nextCursor }` out. No offsets.
- **Request ids.** Demerzel stamps `Seldon-Request-Id` on every response
  and propagates it through RPC into logs and the audit trail.
- **Immutability is cacheable.** Epochs, outcomes, and question/scenario
  versions never change once published, so they carry strong `ETag`s and
  long `Cache-Control`; `latest` aliases redirect (307) to the pinned id.
- **Rate limits** are per-identity token buckets, tighter on expensive
  routes (`POST …/runs`, `/explore`); exceeding one returns `429` with
  `Retry-After`.

## Resource surface

| Resource | Backing service | Representative routes |
| --- | --- | --- |
| Worlds | Radiant | `GET /worlds` · `GET /worlds/{worldId}` |
| Epochs | Radiant | `GET /worlds/{worldId}/epochs` · `GET /worlds/{worldId}/epochs/latest` |
| Forks | Radiant | `GET/POST /worlds/{worldId}/forks` · `GET /forks/{forkId}` |
| Layers | Radiant | `GET /worlds/{worldId}/layers` |
| Dossiers | Radiant | `GET /households/{householdId}/dossier` |
| Explore | Radiant | `POST /worlds/{worldId}/explore` (DSL count/breakdown/sample) |
| Map tiles | R2 via gateway | `GET /worlds/{worldId}/tiles/{epochId}.pmtiles` (Range pass-through) |
| Sources | Encyclopedia | `GET /sources` · `GET /sources/{sourceId}` · `POST /sources/{sourceId}/ingest` · `POST /sources/{sourceId}/repin` · `POST /sources/{sourceId}/upload` |
| Data versions | Encyclopedia | `GET /data-versions` · `GET /data-versions/{id}/lineage` |
| Scenarios | Vault | `GET/POST /scenarios` · `GET /scenarios/{id}/versions/{v}` · `POST /scenarios/{id}/lint` |
| Questions | Vault | `GET/POST /questions` · `GET /questions/{id}/versions/{v}` |
| Runs | Vault + Psychohistory | `POST /questions/{id}/runs` · `GET /runs/{runId}` · `POST /runs/{runId}/cancel` · `WS /runs/{runId}/progress` |
| Outcomes | Vault | `GET /runs/{runId}/outcome` · `GET /outcomes/{outcomeId}` · `GET /outcomes/{outcomeId}/export` |
| Calibration | Second Foundation | `GET /calibration` · `GET /backtests` · `GET /drift` |
| Audit | Demerzel | `GET /audit` (owner only) |
| Meta | Demerzel | `GET /openapi.json` · `GET /healthz` |

Tiles are bulk bytes, not JSON: Demerzel authenticates the request, then
streams the PMTiles archive from R2 honouring `Range`, so MapLibre's range
requests work unmodified ([09-terminus](09-terminus.md)).

### Representative route: launch a run

```jsonc
POST /questions/general-election-today/runs
{
  "questionVersion": 4,
  "scenario": { "slug": "current-polling", "version": 12 },
  "population": { "epochId": "ep_5f9c2a1d44e0" },  // or { "forkId": … }
  "iterations": 1000,
  "seed": 20260824
}
```

```jsonc
202 Accepted
{
  "runId": "run_01j9dq3zx8k7abcdefghjkmnpq",
  "status": "queued",
  "tuple": {                       // the reproducibility tuple, resolved
    "worldId": "uk", "epochOrForkId": "ep_5f9c2a1d44e0",
    "scenarioHash": "sc_9f2c1a4d7b03", "questionVersion": 4,
    "engineVersion": "1.3.0",      // pinned server-side, never client-set
    "seed": 20260824
  },
  "links": { "self": "/runs/run_01j9dq3zx8k7abcdefghjkmnpq",
             "progress": "/runs/run_01j9dq3zx8k7abcdefghjkmnpq/progress" }
}
```

Run creation is naturally idempotent: a request resolving to an existing
run's tuple returns `200` with that run rather than creating a duplicate —
reproducibility doubles as dedupe ([08-engine](08-engine.md)).

### Representative route: the dossier

```jsonc
GET /households/uk:E14001279:hh:00b3c1/dossier
200 OK
{
  "householdId": "uk:E14001279:hh:00b3c1",
  "worldId": "uk",
  "epochId": "ep_5f9c2a1d44e0",
  "seat": { "id": "E14001279", "name": "Wakefield and Rothwell" },
  "location": { "lat": 53.68, "lng": -1.50,
                "placement": "synthetic-density-weighted" },
  "attributes": [
    { "key": "tenure", "value": "social-rent", "layer": "census-base",
      "provenance": "ons-census-2021/TS054@v3" },
    { "key": "incomeBand", "value": "20-30k", "layer": "modelled:income@2",
      "provenance": "modelled: tenure + qualification + region" }
  ],
  "persons": [ { "personId": "uk:E14001279:p:01a2f0", "age": 54, "sex": "female",
                 "qualification": "level-2", "registered": true } ],
  "leanings": { "runId": "run_01j97xn0k2m4p6q8r0s2t4", "asOf": "2026-08-23T06:00:00Z",
                "shares": { "lab": 0.41, "con": 0.18, "ref": 0.24 } },
  "questionHistory": [ /* question id + version + distribution */ ],
  "touchedBy": [ /* scenario rules / Mule events that matched */ ]
}
```

Every attribute carries its layer badge and provenance — the API shape of
the honesty rule in [04-population](04-population.md).

### Representative route: explore

```jsonc
POST /worlds/uk/explore
{ "population": { "epochId": "latest" },
  "predicate": "age > 50 && !degree && income < 50000",
  "view": { "kind": "breakdown", "by": "region" } }
```

Responses return `matched`, the denominator, per-group counts, and the
pinned `epochId` actually resolved against. DSL compilation failures
return `dsl_error` (below) with position and suggestion — the same
diagnostics the scenario lint route emits
([06-scenarios](06-scenarios.md)).

## Error taxonomy

Errors are one envelope everywhere, defined once in `@seldon/foundation`
and thrown as `SeldonError` in every service; Demerzel maps code → HTTP
status at the edge. Unknown exceptions become `internal` with details
stripped — stack traces never leave the boundary.

```jsonc
{
  "error": {
    "code": "dsl_error",
    "message": "unknown field 'incom' in predicate",
    "details": { "position": { "line": 1, "column": 27 },
                 "suggestion": "income" },
    "requestId": "req_01j9ab7fc3d5e7g9h1j3k5"
  }
}
```

| Code | HTTP | Meaning |
| --- | --- | --- |
| `unauthenticated` | 401 | No/invalid Access JWT |
| `forbidden` | 403 | Authenticated but role denies the action |
| `not_found` | 404 | Id does not resolve (or is another world's) |
| `validation_failed` | 400 | Body/params fail the route's Zod schema |
| `dsl_error` | 400 | Predicate fails to compile; positional details |
| `conflict` | 409 | Version conflict (stale `If-Match`, hash mismatch) |
| `unprocessable` | 422 | Valid shape, unrunnable semantics (unpublished epoch, empty frame) |
| `rate_limited` | 429 | Bucket exhausted; `Retry-After` set |
| `payload_too_large` | 413 | Body over route limit |
| `upstream_error` | 502 | Internal RPC call failed |
| `unavailable` | 503 | Dependency down or shedding load |
| `internal` | 500 | Unclassified fault; request id for the logs |

`@seldon/client` surfaces these as a discriminated union, so Terminus
handles `dsl_error` exhaustively rather than string-matching messages.

## Internal RPC

Nothing behind Demerzel has a public URL. Services expose typed
`WorkerEntrypoint` classes consumed over service bindings — a JavaScript
method call across isolates, not HTTP:

Each service's RPC surface is declared once as an interface in
`@seldon/foundation` and implemented by its entrypoint, so callers depend
on the contract rather than on another app's source — the services call
each other in a cycle, which cross-app imports cannot express
([D13](14-decisions.md)):

```ts
// packages/foundation/src/rpc.ts
export interface RadiantRpc extends HealthRpc {
  getDossier(id: HouseholdId): Promise<Dossier>;
  explore(w: WorldId, req: ExploreRequest): Promise<ExploreResult>;
  listEpochs(w: WorldId): Promise<EpochSummary[]>;
}
```

```ts
// apps/radiant/src/entrypoint.ts
import { WorkerEntrypoint } from "cloudflare:workers";
import type { RadiantRpc } from "@seldon/foundation";

export class RadiantEntrypoint
  extends WorkerEntrypoint<RadiantEnv>
  implements RadiantRpc
{
  async getDossier(id: HouseholdId): Promise<Dossier> { /* shard DO */ }
  // …
}
```

```ts
// apps/demerzel — wrangler.jsonc binds
//   { "binding": "RADIANT", "service": "seldon-radiant-staging",
//     "entrypoint": "RadiantEntrypoint" }
interface DemerzelEnv {
  RADIANT: RadiantRpc;
}
const dossier = await env.RADIANT.getDossier(householdId);
```

Pattern rules: **validate once, at the edge** — Demerzel parses untrusted
input against the route schema, so entrypoint arguments are
already-branded domain types and internal calls trust their types (the
trust boundary is the gateway, [03-architecture](03-architecture.md));
**structured-clone payloads** — plain data only, with large artefacts
passed as R2 references, never inline; **errors survive the hop** —
`SeldonError` carries its code across the RPC boundary via a registered
serialiser, so a shard's `not_found` maps to 404, not 502; **bindings are
SCREAMING_SNAKE and service-prefixed**
([10-data-model](10-data-model.md)).

## Realtime: the run progress WebSocket

`GET /runs/{runId}/progress` with `Upgrade: websocket`. Demerzel validates
the Access JWT on the upgrade (the browser's Access cookie applies), then
forwards the socket over the Psychohistory binding to the run's
coordinator DO, which holds it with the WebSocket hibernation API. All
server messages are a discriminated union on `type`, each with a
monotonic `seq`:

```jsonc
{ "type": "hello", "runId": "run_01j9dq3zx8k7abcdefghjkmnpq", "seq": 0,
  "status": "running", "iterations": 1000, "seatsTotal": 650 }
{ "type": "progress", "seq": 41, "seatsDone": 312,
  "headline": { "shares": { "lab": 0.34, "ref": 0.27 },
                "band": 0.012 } }        // convergence half-width
{ "type": "complete", "seq": 97, "outcomeId": "out_01j9ac5dv6w8x0y2z4a6b8" }
{ "type": "failed", "seq": 55,
  "error": { "code": "unprocessable", "message": "…" } }
```

Contract points: the coordinator coalesces updates (≤ 2 messages/second);
clients reconnect with `?after={seq}` and the coordinator replays from
its state; subscribing to a finished run yields `hello` plus the terminal
message immediately; sockets close `1000` after a terminal message,
`4404` for an unknown run, `4401` for failed auth. Clients send nothing —
the socket is one-way; polling `GET /runs/{runId}` exposes the same
status fields as a fallback. A Terminus presence DO is a roadmap-tier
second socket, out of scope here. The choreography behind the messages is
[08-engine](08-engine.md)'s.

## Auth, roles, audit

Cloudflare Access fronts both public hostnames (Terminus and the API).
Demerzel independently verifies the `Cf-Access-Jwt-Assertion` on every
request — signature against the team's published keys (cached in KV),
audience and issuer checks — never trusting the network path alone.
Automation uses Access service tokens, which verify the same way.

Verified identity maps to a role through a small owner-managed map
(email or token id → role) held in Demerzel's config; authenticated but
unmapped identities are denied. Three roles in v1
([D8](14-decisions.md)):

| Capability | viewer | operator | owner |
| --- | --- | --- | --- |
| Read population, catalogue, outcomes, calibration | ✓ | ✓ | ✓ |
| Subscribe to run progress | ✓ | ✓ | ✓ |
| Author scenarios/questions; create forks; launch and cancel runs | — | ✓ | ✓ |
| Trigger ingests; upload `needs-url` sources | — | ✓ | ✓ |
| Repin source checksums; manage worlds and layers | — | — | ✓ |
| Manage the role map; read the audit log | — | — | ✓ |

Every route declares its minimum role in its schema (so the requirement
appears in OpenAPI and the generated client), and every mutating request
writes an audit row to Demerzel's D1 (DDL in
[10-data-model](10-data-model.md)): timestamp, request id, actor, role,
method, route, resource type and id, action, status, latency, and origin
(console, client, or service token). Writes are asynchronous
(`ctx.waitUntil`) with a dropped-write counter in Analytics Engine — the
audit trail is honest about its own gaps. Reads are logged, not audited.

## `@seldon/client` — generated, never written

Each route is declared once, as data, with Zod schemas:

```ts
export const getDossier = route({
  method: "get",
  path: "/households/{householdId}/dossier",
  params: z.object({ householdId: HouseholdIdSchema }),
  response: DossierSchema,
  errors: ["not_found"],
  role: "viewer",
});
```

From this single registry the build derives three artefacts: the Hono
handler types Demerzel implements against (a handler that drifts from its
schema fails typecheck); the OpenAPI 3.1 document served at
`/openapi.json`; and `@seldon/client` — one typed function per route,
branded ids in and out, the error union above, and a
`client.runs.progress(runId)` helper yielding the WebSocket union as an
async iterator. CI regenerates the client and fails on diff so it cannot
go stale, and a lint rule keeps raw `fetch` out of Terminus: the console
consumes only the client ([09-terminus](09-terminus.md)).

## Versioning policy

The API has exactly one first-party consumer, generated from the same
commit as the gateway — so v1 policy is **lockstep, with a compatibility
window**, not URL versioning:

- Client and gateway deploy from the same monorepo commit; the only skew
  is the gradual-rollout overlap ([12-deployment](12-deployment.md)), so
  every change must tolerate a one-release-old counterpart.
- **Additive changes are free**: new routes, optional fields, enum
  members. The generated client ignores unknown response fields and gives
  enums an explicit unknown case.
- **Breaking changes take two releases**: ship the replacement, mark the
  old shape deprecated in the route registry (surfaced in OpenAPI), remove
  it one production release later. Fields never change type or meaning in
  place.
- Responses carry `Seldon-Api-Version` (the gateway build); the OpenAPI
  document is the versioned contract artefact, committed with the repo.
- If third-party consumers ever arrive, breaking generations get a `/v2`
  path prefix, granted deliberately — never dates, never implicit.

Related: [02-lexicon](02-lexicon.md) ·
[03-architecture](03-architecture.md) · [04-population](04-population.md)
· [06-scenarios](06-scenarios.md) · [07-questions](07-questions.md) ·
[08-engine](08-engine.md) · [09-terminus](09-terminus.md) ·
[10-data-model](10-data-model.md) · [12-deployment](12-deployment.md) ·
[14-decisions](14-decisions.md)
