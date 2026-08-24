import { DurableObject } from "cloudflare:workers";
import type { RadiantEnv } from "./env.js";

/**
 * WorldRegistry — one object per world, coordinating its shards
 * (docs/03-architecture.md). P0: it knows which world it is and how many
 * shards that world expects.
 */
export class WorldRegistry extends DurableObject<RadiantEnv> {
  async summary(worldId: string): Promise<{
    worldId: string;
    shardLevel: string;
    expectedShards: number;
  }> {
    const { geographyFor } = await import("@seldon/geo");
    const geography = geographyFor(worldId);
    return {
      worldId,
      shardLevel: geography.shardLevel,
      expectedShards: geography.levels[geography.shardLevel].approximateCount,
    };
  }
}
