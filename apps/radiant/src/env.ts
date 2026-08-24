import type { SeldonEnvironment, VaultRpc } from "@seldon/foundation";
import type { SeatShard } from "./shard.js";
import type { WorldRegistry } from "./world-registry.js";

/**
 * Radiant's bindings. Names are environment-invariant — only
 * configuration maps a binding to an env-specific resource
 * (docs/10-data-model.md).
 */
export interface RadiantEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;

  RADIANT_DB: D1Database;
  EPOCH_BUCKET: R2Bucket;
  TILE_BUCKET: R2Bucket;
  AGG_KV: KVNamespace;
  TILES_KV: KVNamespace;
  SYNTH_TASKS_QUEUE: Queue<SynthTask>;
  SYNTH_WF: Workflow;
  SHARD_DO: DurableObjectNamespace<SeatShard>;
  WORLD_REGISTRY_DO: DurableObjectNamespace<WorldRegistry>;
  VAULT: VaultRpc;
}

/**
 * Queue payloads are versioned schemas: during a gradual rollout a queue
 * consumer may briefly span Worker versions (docs/12-deployment.md).
 */
export interface SynthTask {
  v: 1;
  worldId: string;
  seatId: string;
  epochId: string;
}
