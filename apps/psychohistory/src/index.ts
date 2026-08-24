/**
 * Psychohistory — the engine (docs/08-engine.md). No public routes; no
 * domain state of its own.
 */
import { createLogger, SeldonError } from "@seldon/foundation";
import type { PsychohistoryEnv, SimTask } from "./env.js";

export { RunCoordinator } from "./coordinator.js";
export { PsychohistoryEntrypoint } from "./entrypoint.js";

export default {
  fetch(): Response {
    const error = new SeldonError(
      "not_found",
      "psychohistory has no public routes; call it over a service binding",
    );
    return Response.json(error.toWire(), { status: error.httpStatus });
  },

  /** Per-seat simulation tasks. Shard-local compute lives behind this. */
  async queue(
    batch: MessageBatch<SimTask>,
    env: PsychohistoryEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const log = createLogger({
      service: "psychohistory",
      environment: env.ENVIRONMENT,
    });
    for (const message of batch.messages) {
      if (message.body.v !== 1) {
        log.warn("unknown sim task version", { version: message.body.v });
        message.retry();
        continue;
      }
      log.info("sim task received", {
        runId: message.body.runId,
        seatId: message.body.seatId,
      });
      message.ack();
    }
  },
} satisfies ExportedHandler<PsychohistoryEnv, SimTask>;
