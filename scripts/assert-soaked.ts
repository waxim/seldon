#!/usr/bin/env bun
/**
 * `bun run scripts/assert-soaked.ts --env staging`
 *
 * Production never receives a SHA staging has not run
 * (docs/12-deployment.md). Every Worker reports the commit it was built
 * from as `BUILD_VERSION`, so the check is simply: is staging serving
 * this commit?
 */
import { createClient } from "@seldon/client";
import { done, fail, heading, step } from "./lib/cli.js";
import { loadConfig } from "./lib/config.js";
import { buildVersion } from "./lib/run.js";

const account = loadConfig().environments.staging;
const expected = await buildVersion();

const clientId = process.env.CF_ACCESS_CLIENT_ID;
const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  fail("set CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET");
}

heading(`Checking staging is serving ${expected}`);

const client = createClient({
  baseUrl: `https://${account.apiHostname}`,
  serviceToken: { clientId, clientSecret },
});

const report = await client.health().catch((error: Error) => {
  fail(`staging health failed: ${error.message}`);
});

step(`staging is serving ${report.version}`);
if (report.version !== expected) {
  fail(
    `staging is serving ${report.version}, not ${expected} - release from a commit staging has already soaked`,
  );
}

done("this commit has soaked in staging");
