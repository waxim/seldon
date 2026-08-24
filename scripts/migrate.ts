#!/usr/bin/env bun
/**
 * `bun run migrate --env <staging|production> [--dry-run]`
 *
 * Applies each service's D1 migration chain before any Worker deploys, so
 * version N of the schema always supports version N-1 of the code
 * (docs/12-deployment.md).
 */
import { existsSync } from "node:fs";
import { RESOURCES, SERVICES } from "@seldon/foundation";
import { done, fail, heading, parseArgs, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";
import { run } from "./lib/run.js";

const { env, services, flags } = parseArgs(process.argv.slice(2));
const dryRun = flags.has("dry-run");

heading(`Applying D1 migrations to ${env}`);

let applied = 0;
for (const service of services) {
  const database = RESOURCES[service].d1[0];
  if (!database) continue;

  const cwd = `${REPO_ROOT}apps/${service}`;
  if (!existsSync(`${cwd}/migrations`)) {
    fail(`${service} binds ${database.binding} but has no migrations/`);
  }

  step(`${SERVICES[service].properName}: ${database.binding}`);
  const result = await run(
    [
      "bunx",
      "wrangler",
      "d1",
      "migrations",
      dryRun ? "list" : "apply",
      database.binding,
      "--env",
      env,
      "--remote",
    ],
    { cwd },
  );
  if (result.code !== 0) fail(`migrations failed for ${service}`);
  applied++;
}

done(`${applied} migration chains ${dryRun ? "listed" : "applied"} on ${env}`);
