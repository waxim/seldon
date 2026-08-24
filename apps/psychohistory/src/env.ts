import type {
  RadiantRpc,
  SeldonEnvironment,
  VaultRpc,
} from "@seldon/foundation";
import type { RunCoordinator } from "./coordinator.js";

export interface PsychohistoryEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;

  RUN_BUCKET: R2Bucket;
  PLANS_KV: KVNamespace;
  SIM_TASKS_QUEUE: Queue<SimTask>;
  COORDINATOR_DO: DurableObjectNamespace<RunCoordinator>;
  RADIANT: RadiantRpc;
  VAULT: VaultRpc;
}

/** Versioned payload: a rollout can briefly span consumer versions. */
export interface SimTask {
  v: 1;
  runId: string;
  worldId: string;
  seatId: string;
  iterations: number;
}
