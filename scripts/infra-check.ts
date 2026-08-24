#!/usr/bin/env bun
/**
 * `bun run infra:check [--strict]`
 *
 * Polices the seam between the two IaC layers (docs/12-deployment.md).
 *
 * Every `apps/*​/wrangler.jsonc` is re-derived from the resource table in
 * `@seldon/foundation` plus the synced Pulumi outputs, and compared with
 * what is committed. Any difference — a hand-edited binding, a stale
 * database id, a bucket that Pulumi no longer creates — fails.
 *
 * Plain mode is what pull-request CI runs: it checks names, bindings and
 * whatever ids have been synced. `--strict` is what the deploy job runs:
 * it additionally refuses placeholder ids and placeholder hostnames, so
 * an environment that has never had `pulumi up` cannot be deployed to.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEPLOYABLE_ENVIRONMENTS,
  inventory,
  SERVICE_NAMES,
} from "@seldon/foundation";
import { done, fail, heading, step } from "./lib/cli.js";
import {
  isPlaceholder,
  loadConfig,
  parseJsonc,
  REPO_ROOT,
} from "./lib/config.js";
import { readAllStackOutputs } from "./lib/stack-outputs.js";
import { buildWranglerConfig } from "./lib/wrangler-config.js";

const strict = process.argv.includes("--strict");
const outputs = readAllStackOutputs();
const config = loadConfig();
const problems: string[] = [];

heading("Checking wrangler configs against the resource table");

for (const service of SERVICE_NAMES) {
  const path = join(REPO_ROOT, "apps", service, "wrangler.jsonc");
  const committed = parseJsonc<Record<string, unknown>>(
    readFileSync(path, "utf8"),
  );
  const expected = buildWranglerConfig(service, { outputs });

  const differences = diff(expected, committed, "");
  if (differences.length === 0) {
    step(`${service}: matches`);
  } else {
    for (const difference of differences) {
      problems.push(`apps/${service}/wrangler.jsonc ${difference}`);
    }
  }
}

heading("Checking Pulumi outputs cover every declared resource");

for (const env of DEPLOYABLE_ENVIRONMENTS) {
  const stack = outputs[env];
  const declared = inventory(env);

  if (!stack) {
    const message = `no synced outputs for ${env} (run \`bun run infra:up --env ${env}\`)`;
    if (strict) problems.push(message);
    else step(`${env}: ${message}; name-level checks only`);
    continue;
  }

  for (const database of declared.d1Databases) {
    if (!stack.d1Databases[database]) {
      problems.push(`${env}: Pulumi has no id for D1 ${database}`);
    }
  }
  for (const namespace of declared.kvNamespaces) {
    if (!stack.kvNamespaces[namespace]) {
      problems.push(`${env}: Pulumi has no id for KV ${namespace}`);
    }
  }
  for (const bucket of declared.r2Buckets) {
    if (!stack.r2Buckets.includes(bucket)) {
      problems.push(`${env}: Pulumi does not create R2 bucket ${bucket}`);
    }
  }
  for (const queue of declared.queues) {
    if (!stack.queues.includes(queue)) {
      problems.push(`${env}: Pulumi does not create queue ${queue}`);
    }
  }

  // Resources Pulumi creates that nothing binds are waste, not drift, so
  // they are reported but never fatal.
  for (const bucket of stack.r2Buckets) {
    if (!declared.r2Buckets.includes(bucket)) {
      step(`${env}: note - Pulumi creates unbound bucket ${bucket}`);
    }
  }
  step(`${env}: outputs cover every declared resource`);
}

if (strict) {
  heading("Strict checks");
  for (const env of DEPLOYABLE_ENVIRONMENTS) {
    if (isPlaceholder(config.environments[env])) {
      problems.push(
        `${env}: config/environments.json still uses .example hostnames`,
      );
    }
    const raw = SERVICE_NAMES.map((service) =>
      readFileSync(join(REPO_ROOT, "apps", service, "wrangler.jsonc"), "utf8"),
    ).join("\n");
    if (raw.includes("pulumi:")) {
      problems.push(
        `${env}: wrangler configs still carry pulumi: placeholder ids`,
      );
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`   - ${problem}`);
  fail(`${problems.length} drift problem(s) between infra/ and wrangler`);
}

done("wrangler configs and Pulumi agree");

/** A readable structural diff: paths that differ, not a JSON dump. */
function diff(expected: unknown, actual: unknown, path: string): string[] {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return [`${path}: expected ${kind(expected)}, found ${kind(actual)}`];
    }
    if (expected.length !== actual.length) {
      return [
        `${path}: expected ${expected.length} entries, found ${actual.length}`,
      ];
    }
    return expected.flatMap((entry, index) =>
      diff(entry, actual[index], `${path}[${index}]`),
    );
  }

  if (isRecord(expected) && isRecord(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    return [...keys].flatMap((key) => {
      const next = path ? `${path}.${key}` : key;
      if (!(key in expected)) return [`${next}: unexpected key`];
      if (!(key in actual)) return [`${next}: missing`];
      return diff(expected[key], actual[key], next);
    });
  }

  return expected === actual
    ? []
    : [
        `${path}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`,
      ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kind(value: unknown): string {
  if (Array.isArray(value)) return "an array";
  if (isRecord(value)) return "an object";
  return JSON.stringify(value);
}
