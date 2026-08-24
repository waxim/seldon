#!/usr/bin/env bun
/**
 * `bun run smoke --env <staging|production>`
 *
 * The health walk: `GET /healthz` (shallow) and `GET /healthz/deep`
 * (every service's RPC health, through the gateway), authenticated with
 * the CI Access service token from `infra/` (docs/12-deployment.md).
 */
import { createClient } from "@seldon/client";
import { done, fail, heading, parseArgs, step } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";

const { env } = parseArgs(process.argv.slice(2));
const account = loadConfig().environments[env];

const clientId = process.env.CF_ACCESS_CLIENT_ID;
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  fail(
    "set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET (the CI service token from infra/)",
  );
}

const client = createClient({
  baseUrl: `https://${account.apiHostname}`,
  serviceToken: { clientId, clientSecret },
});

heading(`Smoke test: ${account.apiHostname}`);

step("GET /healthz");
const shallow = await client.health().catch((error: Error) => {
  fail(`shallow health failed: ${error.message}`);
});
if (shallow.status !== "ok") {
  fail(`gateway reports ${shallow.status}`);
}
step(`gateway ${shallow.version} in ${shallow.environment}`);

step("GET /healthz/deep");
const deep = await client.deepHealth().catch((error: Error) => {
  fail(`deep health failed: ${error.message}`);
});
for (const check of deep.checks ?? []) {
  step(
    `${check.name}: ${check.status}${check.detail ? ` (${check.detail})` : ""}`,
  );
}
const unwell = (deep.checks ?? []).filter((check) => check.status !== "ok");
if (unwell.length > 0) {
  fail(`unhealthy: ${unwell.map((check) => check.name).join(", ")}`);
}

step("GET /worlds");
const worlds = await client.worlds.list().catch((error: Error) => {
  fail(`world list failed: ${error.message}`);
});
if (worlds.length === 0) {
  fail("no worlds returned; the gateway reached Radiant but got nothing");
}
step(`${worlds.length} world(s): ${worlds.map((w) => w.worldId).join(", ")}`);

done(`${env} is answering on every surface the walk knows about`);
