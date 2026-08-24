import { DurableObject } from "cloudflare:workers";
import type { RunProgress } from "@seldon/foundation";
import type { PsychohistoryEnv } from "./env.js";

/**
 * RunCoordinator — one Durable Object per run. It compiles the plan, fans
 * per-seat tasks out over Queues, aggregates the partials and streams
 * progress to Terminus over a hibernating WebSocket
 * (docs/08-engine.md, docs/11-api.md).
 *
 * P0: it holds run state and can be addressed. Compilation, fan-out and
 * the ensemble arrive with P3.
 */
export class RunCoordinator extends DurableObject<PsychohistoryEnv> {
  async begin(runId: string, seatsTotal: number): Promise<RunProgress> {
    const progress: RunProgress = {
      runId,
      status: "queued",
      seatsTotal,
      seatsDone: 0,
      seq: 0,
    };
    await this.ctx.storage.put("progress", progress);
    return progress;
  }

  async progress(): Promise<RunProgress> {
    return (
      (await this.ctx.storage.get<RunProgress>("progress")) ?? {
        runId: null,
        status: "idle",
        seatsTotal: 0,
        seatsDone: 0,
        seq: 0,
      }
    );
  }
}
