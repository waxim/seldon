/**
 * The account-level layer (docs/12-deployment.md).
 *
 * Anything that holds data or grants access outlives any deploy and lives
 * here; anything that is an attribute of a Worker deploy lives in that
 * app's `wrangler.jsonc`. The exports below are the contract between the
 * two layers: `bun run infra:up` syncs them to `infra/outputs/<env>.json`
 * and `bun run infra:check` fails CI when a wrangler config disagrees.
 */
import * as pulumi from "@pulumi/pulumi";
import { access, ciServiceToken } from "./src/access.js";
import { buckets } from "./src/buckets.js";
import { environment } from "./src/config.js";
import { databases } from "./src/databases.js";
import { hostnames } from "./src/dns.js";
import { kvNamespaces } from "./src/kv.js";
import { queues } from "./src/queues.js";

export const stackEnvironment = environment;

export const d1Databases = pulumi
  .all([...databases].map(([name, db]) => db.id.apply((id) => [name, id])))
  .apply((entries) => Object.fromEntries(entries as [string, string][]));

export const kvNamespaceIds = pulumi
  .all([...kvNamespaces].map(([name, ns]) => ns.id.apply((id) => [name, id])))
  .apply((entries) => Object.fromEntries(entries as [string, string][]));

export const r2Buckets = [...buckets.keys()];
export const queueNames = [...queues.keys()];

export const consoleHostname = hostnames.console;
export const apiHostname = hostnames.api;

export const accessApplicationIds = {
  console: access.applications.console.id,
  api: access.applications.api.id,
};

/**
 * The CI service token's secret is a stack secret; CI reads it from the
 * GitHub environment, not from here. Only the id is exported.
 */
export const ciServiceTokenClientId = ciServiceToken.clientId;
