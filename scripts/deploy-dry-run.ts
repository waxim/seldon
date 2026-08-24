#!/usr/bin/env bun
/**
 * `bun run deploy:dry-run [--env staging]`
 *
 * Bundles every app and validates its wrangler config without touching
 * the account — the check that catches a broken import, a missing Durable
 * Object export or an invalid binding before a deploy job does.
 */
import { DEPLOY_ORDER, SERVICES } from "@seldon/foundation";
import { done, fail, heading, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";
import { run } from "./lib/run.js";

const index = process.argv.indexOf("--env");
const env = index === -1 ? undefined : process.argv[index + 1];

heading(`Dry-run bundling every app${env ? ` for ${env}` : ""}`);

const failures: string[] = [];
for (const service of DEPLOY_ORDER) {
  step(SERVICES[service].properName);
  const result = await run(
    [
      "bunx",
      "wrangler",
      "deploy",
      "--dry-run",
      "--outdir",
      "dist/dry-run",
      ...(env ? ["--env", env] : []),
    ],
    { cwd: `${REPO_ROOT}apps/${service}`, quiet: true },
  );
  if (result.code !== 0) {
    failures.push(service);
    console.error(result.stderr.trim());
  }
}

if (failures.length > 0) fail(`dry run failed for: ${failures.join(", ")}`);
done(`${DEPLOY_ORDER.length} apps bundle and validate`);
