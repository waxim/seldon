/**
 * Radiant — the population service (docs/04-population.md).
 *
 * This Worker has no public routes: everything reaches it over a service
 * binding into `RadiantEntrypoint`. The default fetch handler exists only
 * to say so out loud if something ever points a hostname at it.
 */
import { createLogger, SeldonError } from "@seldon/foundation";
import type { RadiantEnv, SynthTask } from "./env.js";

export { RadiantEntrypoint } from "./entrypoint.js";
export { SeatShard } from "./shard.js";
export { SynthesisWorkflow } from "./synthesis-workflow.js";
export { WorldRegistry } from "./world-registry.js";

export default {
  fetch(): Response {
    const error = new SeldonError(
      "not_found",
      "radiant has no public routes; call it over a service binding",
    );
    return Response.json(error.toWire(), { status: error.httpStatus });
  },

  /**
   * Synthesis fan-out: one seat per invocation, so a seat that fails
   * retries alone and lands in the DLQ alone (docs/04-population.md).
   */
  async queue(
    batch: MessageBatch<SynthTask>,
    env: RadiantEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const log = createLogger({
      service: "radiant",
      environment: env.ENVIRONMENT,
    });
    for (const message of batch.messages) {
      const task = message.body;
      if (task.v !== 1) {
        log.warn("unknown synth task version", { version: task.v });
        message.retry();
        continue;
      }
      const shard = `${task.worldId}:${task.seatId}`;
      const stub = env.SHARD_DO.get(env.SHARD_DO.idFromName(shard));
      await stub.claim(task.worldId, task.seatId);
      log.info("seat claimed", { shard, epochId: task.epochId });
      message.ack();
    }
  },
} satisfies ExportedHandler<RadiantEnv, SynthTask>;
