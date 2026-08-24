# `infra/` — the account layer

Pulumi TypeScript. Two stacks, `staging` and `production`, each owning
the resources that outlive a deploy: R2 buckets, D1 databases, Queues and
their DLQs, KV namespaces, the Cloudflare Access applications and
policies, and the CI service token. Everything Worker-attached — bindings,
DO class migrations, routes, crons — belongs to each app's
`wrangler.jsonc` instead (docs/12-deployment.md).

## One-off bootstrap

Pulumi state lives in a dedicated R2 bucket over the S3-compatible
backend, so everything stays on Cloudflare. That bucket is the single
hand-made resource:

```bash
# 1. Create the state bucket once, by hand.
bunx wrangler r2 bucket create seldon-pulumi-state

# 2. Point Pulumi at it (account id from the Cloudflare dashboard).
export AWS_ACCESS_KEY_ID=<r2 access key id>
export AWS_SECRET_ACCESS_KEY=<r2 secret access key>
pulumi login "s3://seldon-pulumi-state?endpoint=<account>.r2.cloudflarestorage.com&s3ForcePathStyle=true&region=auto"

# 3. Create the stacks and fill in the account facts.
pulumi stack init staging
pulumi config set seldon:accountId <account id>
pulumi config set seldon:zoneId <zone id>
pulumi config set --secret cloudflare:apiToken <token>
```

`PULUMI_CONFIG_PASSPHRASE` encrypts stack secrets; CI reads it from the
GitHub environment.

## Day to day

```bash
bun run infra:up --env staging     # pulumi up, then sync outputs
bun run gen:wrangler               # regenerate the wrangler configs
bun run infra:check                # assert the two layers still agree
```

Hostnames are **not** configured here: they live in
`config/environments.json`, which both this project and the generated
wrangler route blocks read, so a route and its Access application cannot
drift apart.
