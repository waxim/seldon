import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type HealthReport,
  healthReport,
  type RunSummary,
  type VaultRpc,
} from "@seldon/foundation";
import type { VaultEnv } from "./env.js";

/**
 * Vault's RPC surface — the archive of every prediction ever made
 * (docs/06-scenarios.md, docs/07-questions.md).
 *
 * P0 answers health. Scenarios, questions, runs and outcomes arrive with
 * P3; the D1 schema they will fill is already migrated in.
 */
export class VaultEntrypoint
  extends WorkerEntrypoint<VaultEnv>
  implements VaultRpc
{
  async health(): Promise<HealthReport> {
    const checks: NonNullable<HealthReport["checks"]> = [];
    try {
      await this.env.VAULT_DB.prepare("SELECT 1").first();
      checks.push({ name: "VAULT_DB", status: "ok" });
    } catch (cause) {
      checks.push({
        name: "VAULT_DB",
        status: "failing",
        detail: cause instanceof Error ? cause.message : String(cause),
      });
    }
    return healthReport(
      "vault",
      this.env.ENVIRONMENT,
      this.env.BUILD_VERSION,
      checks,
    );
  }

  /** Nothing has been run yet; the archive is honestly empty. */
  async listRuns(): Promise<RunSummary[]> {
    const { results } = await this.env.VAULT_DB.prepare(
      "SELECT run_id, status, question_slug, created_at FROM runs ORDER BY run_id DESC LIMIT 20",
    ).all<{
      run_id: string;
      status: string;
      question_slug: string;
      created_at: string;
    }>();
    return results.map((row) => ({
      runId: row.run_id,
      status: row.status,
      questionSlug: row.question_slug,
      createdAt: row.created_at,
    }));
  }
}
