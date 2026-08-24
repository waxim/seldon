import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type HealthReport,
  healthReport,
  type RadiantRpc,
  SeldonError,
  type ShardDescription,
  shardNameFor,
  type WorldSummary,
} from "@seldon/foundation";
import { UK_SEAT_TOTAL } from "@seldon/geo";
import type { RadiantEnv } from "./env.js";

/**
 * Radiant's RPC surface. Nothing here has a public URL: Demerzel is the
 * only caller, over a service binding (docs/11-api.md).
 *
 * P0 answers health and lists worlds; the population methods
 * (`getDossier`, `explore`, `listEpochs`) arrive with P2.
 */
export class RadiantEntrypoint
  extends WorkerEntrypoint<RadiantEnv>
  implements RadiantRpc
{
  async health(): Promise<HealthReport> {
    const checks: NonNullable<HealthReport["checks"]> = [];

    checks.push(
      await probe("RADIANT_DB", async () => {
        await this.env.RADIANT_DB.prepare("SELECT 1").first();
      }),
    );
    checks.push(
      await probe("SHARD_DO", async () => {
        const id = this.env.SHARD_DO.idFromName("uk:E14001156");
        await this.env.SHARD_DO.get(id).describe();
      }),
    );

    return healthReport(
      "radiant",
      this.env.ENVIRONMENT,
      this.env.BUILD_VERSION,
      checks,
    );
  }

  /**
   * The walking skeleton's payload: one world, no epoch yet. The registry
   * tables land with P2; until then this is honestly a stub and says so
   * by returning `epochId: null`.
   */
  async listWorlds(): Promise<WorldSummary[]> {
    return [
      {
        worldId: "uk",
        name: "United Kingdom",
        epochId: null,
        seatCount: UK_SEAT_TOTAL,
      },
    ];
  }

  /** Prove the id → shard routing rule end to end. */
  async describeShardFor(entityId: string): Promise<ShardDescription> {
    let name: string;
    try {
      name = shardNameFor(entityId);
    } catch (cause) {
      throw new SeldonError("validation_failed", `malformed id ${entityId}`, {
        cause,
      });
    }
    const stub = this.env.SHARD_DO.get(this.env.SHARD_DO.idFromName(name));
    const described = await stub.describe();
    return { shard: name, ...described };
  }
}

async function probe(
  name: string,
  check: () => Promise<void>,
): Promise<{ name: string; status: "ok" | "failing"; detail?: string }> {
  try {
    await check();
    return { name, status: "ok" };
  } catch (cause) {
    return {
      name,
      status: "failing",
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }
}
