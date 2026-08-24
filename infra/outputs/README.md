# Stack outputs

`bun run infra:up --env <env>` writes `<env>.json` here from
`pulumi stack output --json`. The files are **committed**: resource ids
are not secrets, and having them in the repository is what lets pull-
request CI run `bun run infra:check` — verifying every `wrangler.jsonc`
id against the real stack — without Cloudflare credentials.

Until the first `pulumi up`, no file exists and the generated wrangler
configs carry `pulumi:<kind>:<name>` placeholders. `infra:check --strict`
(used by the deploy workflow, not by PR CI) refuses to pass while any
placeholder remains.
