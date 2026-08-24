import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type HealthReport,
  healthReport,
  type SecondFoundationRpc,
} from "@seldon/foundation";
import type { SecondFoundationEnv } from "./env.js";

/**
 * Second Foundation's RPC surface — calibration, backtests, drift and the
 * freshness watch (docs/03-architecture.md). Nobody interacts with this
 * service directly; it drives the others on cron.
 */
export class SecondFoundationEntrypoint
  extends WorkerEntrypoint<SecondFoundationEnv>
  implements SecondFoundationRpc
{
  async health(): Promise<HealthReport> {
    return healthReport(
      "second-foundation",
      this.env.ENVIRONMENT,
      this.env.BUILD_VERSION,
    );
  }

  /**
   * The watch, as it stands at P0: ask every service whether it is well.
   * Freshness, drift and standing re-runs arrive with P4.
   */
  async watch(): Promise<HealthReport[]> {
    return Promise.all([
      this.env.RADIANT.health(),
      this.env.VAULT.health(),
      this.env.ENCYCLOPEDIA.health(),
      this.env.PSYCHOHISTORY.health(),
    ]);
  }
}
