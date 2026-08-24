/**
 * The single source of truth for every app's `wrangler.jsonc`.
 *
 * `bun run gen:wrangler` writes the committed files from this builder;
 * `bun run infra:check` re-derives them and fails on any drift, so a
 * hand-edited binding or a stale Pulumi id cannot reach a deploy
 * (docs/12-deployment.md).
 */
import {
  CRON_TRIGGERS,
  type DeployableEnvironment,
  RESOURCES,
  resourceName,
  SERVICES,
  type SeldonEnvironment,
  type ServiceName,
  workerName,
} from "@seldon/foundation";
import { loadConfig } from "./config.js";
import type { StackOutputs } from "./stack-outputs.js";

export interface BuildOptions {
  /** Pulumi stack outputs per env, when they have been synced. */
  outputs?: Partial<Record<DeployableEnvironment, StackOutputs>>;
}

/** What a resource id looks like before `infra:up` has ever run. */
export function placeholderId(kind: string, name: string): string {
  return `pulumi:${kind}:${name}`;
}

type Json = Record<string, unknown>;

export function buildWranglerConfig(
  service: ServiceName,
  options: BuildOptions = {},
): Json {
  const config = loadConfig();
  const definition = SERVICES[service];

  const base: Json = {
    $schema: "node_modules/wrangler/config-schema.json",
    name: workerName(service, "dev"),
    main: "src/index.ts",
    compatibility_date: config.compatibilityDate,
    compatibility_flags: config.compatibilityFlags,
    observability: { enabled: true, head_sampling_rate: 1 },
    ...bindingsFor(service, "dev", options),
  };

  if (service === "terminus") {
    base.assets = {
      directory: "./dist/client",
      binding: "ASSETS",
      not_found_handling: "single-page-application",
      run_worker_first: true,
    };
  }

  const crons = CRON_TRIGGERS[service];
  if (crons) base.triggers = { crons: [...crons] };

  const envs: Json = {};
  for (const env of ["staging", "production"] as const) {
    const block: Json = {
      name: workerName(service, env),
      ...bindingsFor(service, env, options),
    };
    if (crons) block.triggers = { crons: [...crons] };
    if (definition.isPublic) {
      const hostname =
        service === "terminus"
          ? config.environments[env].consoleHostname
          : config.environments[env].apiHostname;
      block.routes = [{ pattern: hostname, custom_domain: true }];
    }
    envs[env] = block;
  }
  base.env = envs;

  return base;
}

function bindingsFor(
  service: ServiceName,
  env: SeldonEnvironment,
  options: BuildOptions,
): Json {
  const resources = RESOURCES[service];
  const outputs =
    env === "dev" ? undefined : options.outputs?.[env as DeployableEnvironment];
  const out: Json = {};

  out.vars = varsFor(service, env);

  if (resources.durableObjects.length > 0) {
    out.durable_objects = {
      bindings: resources.durableObjects.map((spec) => ({
        name: spec.binding,
        class_name: spec.className,
      })),
    };
    // Class migrations are append-only deploy events; wrangler refuses to
    // split traffic on a version containing one, so they ship at 100%.
    if (env === "dev") {
      out.migrations = [
        {
          tag: "v1",
          new_sqlite_classes: resources.durableObjects
            .filter((spec) => spec.sqlite)
            .map((spec) => spec.className),
        },
      ];
    }
  }

  if (resources.d1.length > 0) {
    out.d1_databases = resources.d1.map((spec) => {
      const name = resourceName(spec.base, env);
      return {
        binding: spec.binding,
        database_name: name,
        database_id:
          env === "dev"
            ? "local"
            : (outputs?.d1Databases[name] ?? placeholderId("d1", name)),
        migrations_dir: "migrations",
      };
    });
  }

  if (resources.r2.length > 0) {
    out.r2_buckets = resources.r2.map((spec) => ({
      binding: spec.binding,
      bucket_name: resourceName(spec.base, env),
    }));
  }

  if (resources.kv.length > 0) {
    out.kv_namespaces = resources.kv.map((spec) => {
      const name = resourceName(spec.base, env);
      return {
        binding: spec.binding,
        id:
          env === "dev"
            ? "local"
            : (outputs?.kvNamespaces[name] ?? placeholderId("kv", name)),
      };
    });
  }

  if (resources.queues.length > 0) {
    out.queues = {
      producers: resources.queues.map((spec) => ({
        binding: spec.binding,
        queue: resourceName(spec.base, env),
      })),
      consumers: resources.queues
        .filter((spec) => spec.consumes)
        .map((spec) => ({
          queue: resourceName(spec.base, env),
          max_batch_size: 1,
          max_retries: 3,
          dead_letter_queue: resourceName(spec.dlqBase, env),
        })),
    };
  }

  if (resources.workflows.length > 0) {
    out.workflows = resources.workflows.map((spec) => ({
      binding: spec.binding,
      name: resourceName(spec.base, env),
      class_name: spec.className,
    }));
  }

  if (resources.services.length > 0) {
    out.services = resources.services.map((target) => {
      const entry: Json = {
        binding: SERVICES[target].rpcBinding ?? target.toUpperCase(),
        service: workerName(target, env),
      };
      const entrypoint = SERVICES[target].entrypoint;
      if (entrypoint) entry.entrypoint = entrypoint;
      return entry;
    });
  }

  return out;
}

function varsFor(service: ServiceName, env: SeldonEnvironment): Json {
  const config = loadConfig();
  const vars: Json = {
    ENVIRONMENT: env,
    // CI overwrites this with the deployed commit (scripts/deploy.ts).
    BUILD_VERSION: "dev",
  };
  if (service === "demerzel") {
    const account =
      env === "dev"
        ? undefined
        : config.environments[env as DeployableEnvironment];
    vars.ACCESS_TEAM_DOMAIN = account?.accessTeamDomain ?? "localhost";
    vars.ACCESS_AUD = account ? `seldon-api-${env}` : "dev";
    // Owner-managed identity → role map. Not a secret; edited in review.
    vars.ROLE_MAP = "{}";
  }
  return vars;
}
