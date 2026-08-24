import { DurableObject } from "cloudflare:workers";
import type { RadiantEnv } from "./env.js";

/**
 * SeatShard — one SQLite-backed Durable Object per (world, constituency),
 * ~650 for the UK. It holds that seat's households, persons and cells;
 * simulation compute travels here rather than the rows travelling out
 * (docs/03-architecture.md, docs/10-data-model.md).
 *
 * P0: the object exists, migrates its own schema, and reports what it
 * holds. Synthesis fills it in P2.
 */
export class SeatShard extends DurableObject<RadiantEnv> {
  /** In-object schema version — the idempotent migration ladder. */
  private static readonly SCHEMA_VERSION = 1;

  constructor(ctx: DurableObjectState, env: RadiantEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.migrate();
    });
  }

  /**
   * Runs on construction, so the ~650 shards upgrade lazily on first
   * touch rather than in a fleet-wide stop-the-world.
   */
  private migrate(): void {
    const sql = this.ctx.storage.sql;
    // DO SQLite does not permit `PRAGMA user_version`, so the ladder
    // keeps its own one-row table.
    sql.exec(
      "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)",
    );
    const current = Number(
      sql
        .exec("SELECT COALESCE(MAX(version), 0) AS version FROM schema_version")
        .one().version ?? 0,
    );
    if (current >= SeatShard.SCHEMA_VERSION) return;

    if (current < 1) {
      sql.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          world_id TEXT NOT NULL,
          seat_id TEXT NOT NULL,
          epoch_id TEXT,
          published_at TEXT,
          layer_versions TEXT NOT NULL DEFAULT '{}',
          row_counts TEXT NOT NULL DEFAULT '{}'
        )
      `);
    }
    sql.exec("DELETE FROM schema_version");
    sql.exec(
      "INSERT INTO schema_version (version) VALUES (?)",
      SeatShard.SCHEMA_VERSION,
    );
  }

  /** What this shard holds. Empty until an epoch is published into it. */
  async describe(): Promise<{
    schemaVersion: number;
    epochId: string | null;
    rowCounts: Record<string, number>;
  }> {
    const sql = this.ctx.storage.sql;
    const meta = sql.exec("SELECT epoch_id, row_counts FROM meta").toArray()[0];
    return {
      schemaVersion: SeatShard.SCHEMA_VERSION,
      epochId: (meta?.epoch_id as string | null) ?? null,
      rowCounts: meta ? JSON.parse(String(meta.row_counts)) : {},
    };
  }

  /** Claim this shard for a (world, seat) pair. Idempotent. */
  async claim(worldId: string, seatId: string): Promise<void> {
    const sql = this.ctx.storage.sql;
    const existing = sql.exec("SELECT COUNT(*) AS n FROM meta").one().n;
    if (Number(existing) === 0) {
      sql.exec(
        "INSERT INTO meta (world_id, seat_id) VALUES (?, ?)",
        worldId,
        seatId,
      );
    }
  }
}
