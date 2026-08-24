import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type EncyclopediaRpc,
  type HealthReport,
  healthReport,
  type SourceSummary,
} from "@seldon/foundation";
import type { EncyclopediaEnv } from "./env.js";

/**
 * Encyclopedia's RPC surface — the archive of all sources
 * (docs/05-datasets.md). P0 answers health; the catalogue is P1's.
 */
export class EncyclopediaEntrypoint
  extends WorkerEntrypoint<EncyclopediaEnv>
  implements EncyclopediaRpc
{
  async health(): Promise<HealthReport> {
    const checks: NonNullable<HealthReport["checks"]> = [];
    try {
      await this.env.ENCYCLOPEDIA_DB.prepare("SELECT 1").first();
      checks.push({ name: "ENCYCLOPEDIA_DB", status: "ok" });
    } catch (cause) {
      checks.push({
        name: "ENCYCLOPEDIA_DB",
        status: "failing",
        detail: cause instanceof Error ? cause.message : String(cause),
      });
    }
    return healthReport(
      "encyclopedia",
      this.env.ENVIRONMENT,
      this.env.BUILD_VERSION,
      checks,
    );
  }

  async listSources(worldId: string): Promise<SourceSummary[]> {
    const { results } = await this.env.ENCYCLOPEDIA_DB.prepare(
      "SELECT source_id, tier, cadence FROM sources WHERE world_id = ? ORDER BY tier, source_id",
    )
      .bind(worldId)
      .all<{ source_id: string; tier: number; cadence: string | null }>();
    return results.map((row) => ({
      sourceId: row.source_id,
      tier: row.tier,
      cadence: row.cadence,
    }));
  }
}
