#!/usr/bin/env bun
/**
 * `bun run deploy --env <staging|production> [--gradual]`
 *
 * Deploys every app in the documented order (docs/12-deployment.md). The
 * service graph has one genuine cycle, so a first-ever deploy into an
 * empty environment cannot resolve every binding on the first pass: any
 * failures are retried once, and only a failure that survives the second
 * pass is fatal.
 *
 * `--gradual` uploads a version per app *without* deploying it, and
 * prints the canary commands; promotion and rollback stay deliberate.
 */
import { SERVICES, workerName } from "@seldon/foundation";
import { done, fail, heading, parseArgs, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";
import { buildVersion, run } from "./lib/run.js";

const { env, services, flags } = parseArgs(process.argv.slice(2));
const gradual = flags.has("gradual");
const version = await buildVersion();

heading(`Deploying to ${env} at ${version}${gradual ? " (gradual)" : ""}`);

async function deployOne(service: string): Promise<number> {
  const command = gradual
    ? ["bunx", "wrangler", "versions", "upload"]
    : ["bunx", "wrangler", "deploy"];
  const result = await run(
    [...command, "--env", env, "--var", `BUILD_VERSION:${version}`],
    { cwd: `${REPO_ROOT}apps/${service}` },
  );
  return result.code;
}

const failures: string[] = [];
for (const service of services) {
  step(`${SERVICES[service].properName} -> ${workerName(service, env)}`);
  if ((await deployOne(service)) !== 0) failures.push(service);
}

if (failures.length > 0) {
  heading(`Second pass for ${failures.join(", ")}`);
  const stillFailing: string[] = [];
  for (const service of failures) {
    step(`retrying ${service}`);
    if ((await deployOne(service)) !== 0) stillFailing.push(service);
  }
  if (stillFailing.length > 0) {
    fail(`deploy failed for: ${stillFailing.join(", ")}`);
  }
}

if (gradual) {
  heading("Canary");
  console.log(
    [
      "   Versions are uploaded but not deployed. Start the canary, watch",
      "   error rates, then promote or abort - both take seconds:",
      "",
      `     bunx wrangler versions deploy --env ${env} <new>@10 <old>@90`,
      `     bunx wrangler versions deploy --env ${env} <new>@100   # promote`,
      `     bunx wrangler rollback --env ${env}                    # abort`,
      "",
      "   A version containing a Durable Object class migration cannot be",
      "   split: it ships at 100% after a staging soak.",
    ].join("\n"),
  );
}

done(`${services.length} apps ${gradual ? "uploaded" : "deployed"} to ${env}`);
