/**
 * The name → binding constant table (docs/10-data-model.md), so app code,
 * the wrangler configs and Pulumi never drift.
 *
 * Two rules encoded here and nowhere else:
 *   - physical resource names carry the environment
 *     (`seldon-radiant-db-staging`), and are owned by `infra/`;
 *   - binding names never do — code sees `RADIANT_DB` in every env.
 *
 * `bun run infra:check` compares what this table says a service's
 * `wrangler.jsonc` must contain against what it actually contains, and
 * `infra/` provisions exactly the physical names derived from it.
 */
import type { SeldonEnvironment } from "./environment.js";
import type { ServiceName } from "./services.js";

/** The one naming rule: `seldon-<base>-<env>`. */
export function resourceName(base: string, env: SeldonEnvironment): string {
  return `seldon-${base}-${env}`;
}

/** Workers: `seldon-<service>-<env>`. */
export function workerName(
  service: ServiceName,
  env: SeldonEnvironment,
): string {
  return resourceName(service, env);
}

export interface D1Spec {
  readonly binding: string;
  readonly base: string;
}

export interface R2Spec {
  readonly binding: string;
  readonly base: string;
}

export interface KvSpec {
  readonly binding: string;
  readonly base: string;
}

export interface QueueSpec {
  readonly binding: string;
  readonly base: string;
  readonly dlqBase: string;
  /** Does the owning service also consume this queue? */
  readonly consumes: boolean;
}

export interface WorkflowSpec {
  readonly binding: string;
  readonly base: string;
  readonly className: string;
}

export interface DurableObjectSpec {
  readonly binding: string;
  readonly className: string;
  /** SQLite-backed — mandatory for anything holding population rows. */
  readonly sqlite: boolean;
}

export interface ServiceResources {
  readonly d1: readonly D1Spec[];
  readonly r2: readonly R2Spec[];
  readonly kv: readonly KvSpec[];
  readonly queues: readonly QueueSpec[];
  readonly workflows: readonly WorkflowSpec[];
  readonly durableObjects: readonly DurableObjectSpec[];
  /** Other Seldon services this one calls over a service binding. */
  readonly services: readonly ServiceName[];
}

const NONE = {
  d1: [],
  r2: [],
  kv: [],
  queues: [],
  workflows: [],
  durableObjects: [],
  services: [],
} as const satisfies ServiceResources;

/**
 * Every KV namespace has exactly one writing service bound to it; readers
 * are added when a phase needs them, so a stale cache always has one
 * owner to blame.
 */
export const RESOURCES: Record<ServiceName, ServiceResources> = {
  radiant: {
    d1: [{ binding: "RADIANT_DB", base: "radiant-db" }],
    r2: [
      { binding: "EPOCH_BUCKET", base: "epochs" },
      { binding: "TILE_BUCKET", base: "tiles" },
    ],
    kv: [
      { binding: "AGG_KV", base: "agg-kv" },
      { binding: "TILES_KV", base: "tiles-kv" },
    ],
    queues: [
      {
        binding: "SYNTH_TASKS_QUEUE",
        base: "synth-tasks",
        dlqBase: "synth-tasks-dlq",
        consumes: true,
      },
    ],
    workflows: [
      {
        binding: "SYNTH_WF",
        base: "synthesis",
        className: "SynthesisWorkflow",
      },
    ],
    durableObjects: [
      { binding: "SHARD_DO", className: "SeatShard", sqlite: true },
      {
        binding: "WORLD_REGISTRY_DO",
        className: "WorldRegistry",
        sqlite: true,
      },
    ],
    services: ["vault"],
  },
  encyclopedia: {
    d1: [{ binding: "ENCYCLOPEDIA_DB", base: "encyclopedia-db" }],
    r2: [{ binding: "DATASETS_BUCKET", base: "datasets" }],
    kv: [{ binding: "POLLS_KV", base: "polls-kv" }],
    queues: [],
    workflows: [
      {
        binding: "INGEST_WF",
        base: "ingestion",
        className: "IngestionWorkflow",
      },
    ],
    durableObjects: [],
    services: [],
  },
  vault: {
    d1: [{ binding: "VAULT_DB", base: "vault-db" }],
    r2: [{ binding: "RUN_BUCKET", base: "runs" }],
    kv: [],
    queues: [],
    workflows: [],
    durableObjects: [],
    services: ["psychohistory"],
  },
  psychohistory: {
    d1: [],
    r2: [{ binding: "RUN_BUCKET", base: "runs" }],
    kv: [{ binding: "PLANS_KV", base: "plans-kv" }],
    queues: [
      {
        binding: "SIM_TASKS_QUEUE",
        base: "sim-tasks",
        dlqBase: "sim-tasks-dlq",
        consumes: true,
      },
    ],
    workflows: [],
    durableObjects: [
      { binding: "COORDINATOR_DO", className: "RunCoordinator", sqlite: true },
    ],
    services: ["radiant", "vault"],
  },
  "second-foundation": {
    ...NONE,
    services: ["radiant", "vault", "encyclopedia", "psychohistory"],
  },
  demerzel: {
    d1: [{ binding: "DEMERZEL_DB", base: "demerzel-db" }],
    r2: [],
    kv: [{ binding: "FLAGS_KV", base: "flags-kv" }],
    queues: [],
    workflows: [],
    durableObjects: [],
    services: [
      "radiant",
      "vault",
      "encyclopedia",
      "psychohistory",
      "second-foundation",
    ],
  },
  terminus: {
    ...NONE,
    // Terminus proxies `/api/*` to the gateway over this binding so the
    // console is same-origin under one Access application; the browser
    // still only ever speaks `@seldon/client` (docs/09-terminus.md).
    services: ["demerzel"],
  },
};

/** Every distinct physical resource `infra/` provisions, by kind. */
export function inventory(env: SeldonEnvironment) {
  const d1 = new Set<string>();
  const r2 = new Set<string>();
  const kv = new Set<string>();
  const queues = new Set<string>();

  for (const resources of Object.values(RESOURCES)) {
    for (const spec of resources.d1) d1.add(resourceName(spec.base, env));
    for (const spec of resources.r2) r2.add(resourceName(spec.base, env));
    for (const spec of resources.kv) kv.add(resourceName(spec.base, env));
    for (const spec of resources.queues) {
      queues.add(resourceName(spec.base, env));
      queues.add(resourceName(spec.dlqBase, env));
    }
  }

  return {
    d1Databases: [...d1].sort(),
    r2Buckets: [...r2].sort(),
    kvNamespaces: [...kv].sort(),
    queues: [...queues].sort(),
  };
}

/** Cron schedules, by service (docs/12-deployment.md). */
export const CRON_TRIGGERS: Partial<Record<ServiceName, readonly string[]>> = {
  // Second Foundation's watch. Cadences are deliberately coarse until P4
  // gives them real work to do.
  "second-foundation": ["0 * * * *"],
};
