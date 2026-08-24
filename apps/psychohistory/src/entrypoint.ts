import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type HealthReport,
  healthReport,
  type PsychohistoryRpc,
  type RunProgress,
  SELDON_VERSION,
} from "@seldon/foundation";
import type { PsychohistoryEnv } from "./env.js";

/**
 * Psychohistory's RPC surface — pure compute, no long-lived domain state
 * (docs/08-engine.md). P0 answers health and can address a coordinator.
 */
export class PsychohistoryEntrypoint
  extends WorkerEntrypoint<PsychohistoryEnv>
  implements PsychohistoryRpc
{
  async health(): Promise<HealthReport> {
    const checks: NonNullable<HealthReport["checks"]> = [];
    try {
      const id = this.env.COORDINATOR_DO.idFromName("healthz");
      await this.env.COORDINATOR_DO.get(id).progress();
      checks.push({ name: "COORDINATOR_DO", status: "ok" });
    } catch (cause) {
      checks.push({
        name: "COORDINATOR_DO",
        status: "failing",
        detail: cause instanceof Error ? cause.message : String(cause),
      });
    }
    return healthReport(
      "psychohistory",
      this.env.ENVIRONMENT,
      this.env.BUILD_VERSION,
      checks,
    );
  }

  /** The engine version that pins into every run's tuple. */
  async engineVersion(): Promise<string> {
    return SELDON_VERSION;
  }

  async runProgress(runId: string): Promise<RunProgress> {
    const id = this.env.COORDINATOR_DO.idFromName(runId);
    return this.env.COORDINATOR_DO.get(id).progress();
  }
}
