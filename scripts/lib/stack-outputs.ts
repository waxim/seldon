/**
 * Pulumi stack outputs, synced to `infra/outputs/<env>.json` by
 * `bun run infra:up`.
 *
 * Resource ids are not secrets, so the synced files are committed: PR CI
 * can then check every `wrangler.jsonc` id against the real stack without
 * Cloudflare credentials (docs/12-deployment.md).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DeployableEnvironment } from "@seldon/foundation";
import { REPO_ROOT } from "./config.js";

export interface StackOutputs {
  environment: DeployableEnvironment;
  /** Physical name → id. */
  d1Databases: Record<string, string>;
  kvNamespaces: Record<string, string>;
  /** Names only; buckets and queues are addressed by name. */
  r2Buckets: string[];
  queues: string[];
  syncedAt: string;
}

export function outputsPath(env: DeployableEnvironment): string {
  return join(REPO_ROOT, "infra", "outputs", `${env}.json`);
}

export function readStackOutputs(
  env: DeployableEnvironment,
): StackOutputs | undefined {
  const path = outputsPath(env);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as StackOutputs;
}

export function readAllStackOutputs(): Partial<
  Record<DeployableEnvironment, StackOutputs>
> {
  const all: Partial<Record<DeployableEnvironment, StackOutputs>> = {};
  for (const env of ["staging", "production"] as const) {
    const outputs = readStackOutputs(env);
    if (outputs) all[env] = outputs;
  }
  return all;
}
