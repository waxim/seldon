/**
 * Second Foundation — calibration and watch (docs/03-architecture.md).
 * No public routes; woken by cron.
 */
import { createLogger, SeldonError } from "@seldon/foundation";
import { SecondFoundationEntrypoint } from "./entrypoint.js";
import type { SecondFoundationEnv } from "./env.js";

export { SecondFoundationEntrypoint };

export default {
  fetch(): Response {
    const error = new SeldonError(
      "not_found",
      "second-foundation has no public routes; it runs on cron",
    );
    return Response.json(error.toWire(), { status: error.httpStatus });
  },

  async scheduled(
    controller: ScheduledController,
    env: SecondFoundationEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    const log = createLogger({
      service: "second-foundation",
      environment: env.ENVIRONMENT,
    });
    ctx.waitUntil(
      (async () => {
        const reports = await Promise.all([
          env.RADIANT.health(),
          env.VAULT.health(),
          env.ENCYCLOPEDIA.health(),
          env.PSYCHOHISTORY.health(),
        ]);
        const unwell = reports.filter((r) => r.status !== "ok");
        log.info("watch swept", {
          cron: controller.cron,
          checked: reports.length,
          unwell: unwell.map((r) => r.service),
        });
      })(),
    );
  },
} satisfies ExportedHandler<SecondFoundationEnv>;
