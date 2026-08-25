# P0 — Streeling: acceptance

*The gate rule: a phase begins only when its predecessor's acceptance
checks pass, ticked with evidence rather than assertion
([13-roadmap](13-roadmap.md)).*

This is P0's checklist, kept current as the phase closes out. Evidence is
a command anyone can run, a committed artefact, or a named CI job — never
a claim. Anything that needs a Cloudflare account is marked **blocked on
account**, and P1 does not start until those are ticked too.

## Scope

| Item | State | Evidence |
| --- | --- | --- |
| Monorepo scaffold: Bun workspaces, Turborepo, Biome, TypeScript project references | done | `bun run check` (45 tasks across 14 workspaces) |
| Seven Worker apps, hello-world, every binding type wired | done | `bun run deploy:dry-run` bundles and validates all seven |
| `packages/foundation`: branded ids, error taxonomy, resource/binding table, health contract, logger | done | `packages/foundation/test/` |
| `packages/dsl`: typed field registry from day one | done | `packages/dsl/test/registry.test.ts` |
| `packages/dsl`: grammar, parser, evaluator | **not built** | Deliberately deferred — see *Honest gaps* |
| `packages/parties`, `packages/geo`, `packages/client`, `packages/ui` | done | each package's `test/` |
| Infra bootstrap: Pulumi project, `staging` and `production` stacks, naming live | done (not applied) | `infra/`, `bun run infra:check` |
| `infra:check` in CI | done | `.github/workflows/ci.yml` job `verify` |
| Demerzel + Access: JWT validation, identity → role, audit log | done | `apps/demerzel/test/access.test.ts` |
| Terminus shell: navigation, `@seldon/client` calling Demerzel | done | `apps/terminus/test/terminus.test.ts` |
| Terminus console: every section and sub-screen, routed and designed, with empty states that name their phase | done | `apps/terminus/web/router.test.tsx` walks every route |
| `@seldon/ui`: Foundation-modern tokens, components and hand-rolled SVG charts | done | `packages/ui/test/` — including the WCAG contrast bar |
| CI/CD pipelines including PR preview deploys | written | `.github/workflows/` — unverified until the first pull request runs |

## Accept

- [x] **Clean clone → `bun install && bun run check` green.** Locally
      verified; the same command is the `verify` job in
      `.github/workflows/ci.yml`. Tick the CI half when a pull request has
      run it.
- [ ] **Pulumi `staging` stack up; `infra:check` passes.** `infra:check`
      passes today at name level and reports honestly that no stack
      outputs are synced. **Blocked on account**: run
      `bun run infra:up --env staging`, then `bun run gen:wrangler`, then
      `bun run infra:check --strict`.
- [ ] **A browser session: Access login → Terminus shell → client →
      Demerzel → stub service RPC → response rendered, in staging.** The
      whole path is exercised in tests inside workerd; the staging half is
      **blocked on account** (Access application, zone, hostnames in
      `config/environments.json`).
- [ ] **DSL parses and lints the worked predicate examples; a misspelt
      field fails with a typed error.** Half done: every worked predicate
      from [06-scenarios](06-scenarios.md) passes field lint, and `incom`
      fails as a positional `dsl_error` suggesting `income`
      (`packages/dsl/test/lint.test.ts`). *Parsing* is not built.
- [ ] **A PR shows preview URLs and a green pipeline.** Workflow written;
      unverified.

## Honest gaps

Four things a reader should not have to infer:

1. **The DSL is half a package.** The typed field registry exists — which
   is the half P0 called for by name, because it is what makes a misspelt
   field a compile error instead of an empty match — and the lint on top
   of it reports position and suggestion. The grammar, parser and
   evaluator sketched in [06-scenarios](06-scenarios.md) are not written.
   Until they are, `lintFields` checks identifiers, not expressions: it
   will not catch a type error like `tenure > 5`.
2. **Nothing has been deployed.** Every check that can run without a
   Cloudflare account has been run; nothing that needs one has. The
   placeholders are deliberate and loud: generated `wrangler.jsonc` files
   carry `pulumi:<kind>:<name>` ids, `config/environments.json` carries
   `.example` hostnames, and `infra:check --strict` — which the deploy
   workflow runs — fails on both.
3. **Apps are hello-world by design.** They answer health, prove their
   bindings resolve, migrate their schemas and route a request end to
   end. No population, no ingestion, no engine. The console says as much
   on every screen rather than showing invented numbers.
4. **Terminus is designed, not filled.** Every section of the
   information architecture in [09-terminus](09-terminus.md) exists as a
   routed screen with its real chrome — the columns a table will have,
   the chamber a hemicycle will fill, the five stages an ingest run
   walks — and an empty state naming the phase that fills it. Three
   surfaces are genuinely live: the ⌘K palette, the DSL filter bar
   (typed autocomplete and field lint over the committed registry), and
   the walking-skeleton health call. **MapLibre GL is not installed
   yet**: `MapFrame` holds the zoom ladder and the privacy caption, and
   the map mounts inside it in P2 when there are PMTiles to point it at.

Related: [13-roadmap](13-roadmap.md) · [12-deployment](12-deployment.md) ·
[03-architecture](03-architecture.md) · [14-decisions](14-decisions.md)
