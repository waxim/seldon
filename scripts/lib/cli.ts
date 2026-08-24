/** Tiny argument parsing and output helpers for the deployment scripts. */
import {
  DEPLOY_ORDER,
  type DeployableEnvironment,
  isServiceName,
  type ServiceName,
} from "@seldon/foundation";

export interface CommonArgs {
  env: DeployableEnvironment;
  services: readonly ServiceName[];
  flags: Set<string>;
}

export function parseArgs(argv: string[]): CommonArgs {
  const flags = new Set<string>();
  let env: string | undefined;
  let only: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--env" || arg === "-e") {
      env = argv[++i];
    } else if (arg?.startsWith("--env=")) {
      env = arg.slice("--env=".length);
    } else if (arg === "--only") {
      only = argv[++i];
    } else if (arg?.startsWith("--only=")) {
      only = arg.slice("--only=".length);
    } else if (arg?.startsWith("--")) {
      flags.add(arg.slice(2));
    }
  }

  if (env !== "staging" && env !== "production") {
    throw new Error(
      `--env must be staging or production (got ${JSON.stringify(env)}); dev runs locally with \`bun run dev\``,
    );
  }

  const services = only
    ? only.split(",").map((name) => {
        const trimmed = name.trim();
        if (!isServiceName(trimmed)) {
          throw new Error(`unknown service ${trimmed}`);
        }
        return trimmed;
      })
    : DEPLOY_ORDER;

  return { env, services, flags };
}

export function heading(text: string): void {
  console.log(`\n== ${text}`);
}

export function step(text: string): void {
  console.log(`   - ${text}`);
}

export function done(text: string): void {
  console.log(`\nOK: ${text}`);
}

export function fail(text: string): never {
  console.error(`FAIL: ${text}`);
  process.exit(1);
}
