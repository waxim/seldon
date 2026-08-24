#!/usr/bin/env bun
/**
 * `bun run infra:up --env <staging|production> [--preview]`
 *
 * Runs `pulumi up` for the stack, then syncs its outputs to
 * `infra/outputs/<env>.json` — the file `gen:wrangler` reads for real
 * resource ids and `infra:check` verifies against
 * (docs/12-deployment.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { done, fail, heading, parseArgs, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";
import { mustRun, run } from "./lib/run.js";
import { outputsPath, type StackOutputs } from "./lib/stack-outputs.js";

const { env, flags } = parseArgs(process.argv.slice(2));
const preview = flags.has("preview");
const cwd = `${REPO_ROOT}infra`;

heading(`Pulumi ${preview ? "preview" : "up"} on stack ${env}`);

const result = await run(
  [
    "bunx",
    "pulumi",
    preview ? "preview" : "up",
    "--stack",
    env,
    ...(preview ? [] : ["--yes"]),
  ],
  { cwd },
);
if (result.code !== 0) fail(`pulumi ${preview ? "preview" : "up"} failed`);
if (preview) {
  done("preview only; no outputs synced");
  process.exit(0);
}

step("syncing stack outputs");
const raw = await mustRun(
  ["bunx", "pulumi", "stack", "output", "--stack", env, "--json"],
  { cwd, quiet: true },
);
const stack = JSON.parse(raw.stdout) as {
  d1Databases: Record<string, string>;
  kvNamespaceIds: Record<string, string>;
  r2Buckets: string[];
  queueNames: string[];
};

const outputs: StackOutputs = {
  environment: env,
  d1Databases: stack.d1Databases,
  kvNamespaces: stack.kvNamespaceIds,
  r2Buckets: stack.r2Buckets,
  queues: stack.queueNames,
  syncedAt: new Date().toISOString(),
};

const path = outputsPath(env);
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, `${JSON.stringify(outputs, null, 2)}\n`);

done(
  `outputs synced to infra/outputs/${env}.json - now run \`bun run gen:wrangler\` and commit the result`,
);
