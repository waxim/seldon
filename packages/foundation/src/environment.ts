/** The three environments of docs/12-deployment.md. */
import { z } from "zod";

export const ENVIRONMENTS = ["dev", "staging", "production"] as const;

export type SeldonEnvironment = (typeof ENVIRONMENTS)[number];

export const SeldonEnvironmentSchema = z.enum(ENVIRONMENTS);

export function isEnvironment(value: string): value is SeldonEnvironment {
  return (ENVIRONMENTS as readonly string[]).includes(value);
}

export function parseEnvironment(value: string | undefined): SeldonEnvironment {
  if (value === undefined || !isEnvironment(value)) {
    throw new Error(
      `unknown environment ${JSON.stringify(value)} — expected one of ${ENVIRONMENTS.join(", ")}`,
    );
  }
  return value;
}

/** Environments that exist on the Cloudflare account (dev is local only). */
export const DEPLOYABLE_ENVIRONMENTS = ["staging", "production"] as const;

export type DeployableEnvironment = (typeof DEPLOYABLE_ENVIRONMENTS)[number];

export function isDeployable(
  env: SeldonEnvironment,
): env is DeployableEnvironment {
  return env !== "dev";
}
