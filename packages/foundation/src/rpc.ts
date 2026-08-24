/**
 * The internal RPC contracts.
 *
 * docs/11-api.md types a service binding by importing the callee's
 * entrypoint class. Vault and Psychohistory call each other — Vault
 * records a run before the engine computes it, the engine stores the
 * outcome after — so importing across apps would make the type graph
 * cyclic. The contracts therefore live here, in the package both sides
 * already depend on: one declaration, no cycle, and a service still
 * cannot drift from what its callers expect (each entrypoint declares
 * `implements`).
 */
import type { HealthReport } from "./health.js";

export interface WorldSummary {
  worldId: string;
  name: string;
  /** The live epoch, once there is one. */
  epochId: string | null;
  seatCount: number;
}

export interface ShardDescription {
  shard: string;
  schemaVersion: number;
  epochId: string | null;
}

export interface RunSummary {
  runId: string;
  status: string;
  questionSlug: string;
  createdAt: string;
}

export interface SourceSummary {
  sourceId: string;
  tier: number;
  cadence: string | null;
}

export interface RunProgress {
  runId: string | null;
  status: "idle" | "queued" | "running" | "done" | "failed";
  seatsTotal: number;
  seatsDone: number;
  seq: number;
}

/** Every internal service answers health; the smoke walk depends on it. */
export interface HealthRpc {
  health(): Promise<HealthReport>;
}

export interface RadiantRpc extends HealthRpc {
  listWorlds(): Promise<WorldSummary[]>;
  describeShardFor(entityId: string): Promise<ShardDescription>;
}

export interface VaultRpc extends HealthRpc {
  listRuns(): Promise<RunSummary[]>;
}

export interface EncyclopediaRpc extends HealthRpc {
  listSources(worldId: string): Promise<SourceSummary[]>;
}

export interface PsychohistoryRpc extends HealthRpc {
  engineVersion(): Promise<string>;
  runProgress(runId: string): Promise<RunProgress>;
}

export interface SecondFoundationRpc extends HealthRpc {
  watch(): Promise<HealthReport[]>;
}
