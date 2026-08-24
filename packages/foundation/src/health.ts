/**
 * The health contract every service answers on, and the shape the smoke
 * script walks (docs/12-deployment.md).
 */
import { z } from "zod";
import type { SeldonEnvironment } from "./environment.js";
import type { ServiceName } from "./services.js";

export const HealthStatusSchema = z.enum(["ok", "degraded", "failing"]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthReportSchema = z.object({
  service: z.string(),
  status: HealthStatusSchema,
  environment: z.string(),
  /** The commit this Worker was built from, when CI stamps one. */
  version: z.string(),
  /** Optional per-dependency detail, filled in by `/healthz/deep`. */
  checks: z
    .array(
      z.object({
        name: z.string(),
        status: HealthStatusSchema,
        detail: z.string().optional(),
      }),
    )
    .optional(),
});

export type HealthReport = z.infer<typeof HealthReportSchema>;

export function healthReport(
  service: ServiceName,
  environment: SeldonEnvironment | string,
  version: string,
  checks?: HealthReport["checks"],
): HealthReport {
  const worst = (checks ?? []).reduce<HealthStatus>(
    (acc, check) =>
      check.status === "failing" || acc === "failing"
        ? "failing"
        : check.status === "degraded" || acc === "degraded"
          ? "degraded"
          : "ok",
    "ok",
  );
  return {
    service,
    status: worst,
    environment,
    version,
    ...(checks === undefined ? {} : { checks }),
  };
}
