/**
 * The audit log: every mutating request lands in D1, written
 * asynchronously so a slow insert never slows a response
 * (docs/11-api.md).
 */
import { createLogger, newPrefixedUlid } from "@seldon/foundation";
import type { DemerzelEnv } from "./env.js";
import type { Identity } from "./identity.js";

export interface AuditRow {
  identity: Identity;
  method: string;
  path: string;
  service: string;
  status: number;
  latencyMs: number;
  requestId: string;
}

export async function writeAudit(
  env: DemerzelEnv,
  row: AuditRow,
): Promise<void> {
  try {
    await env.DEMERZEL_DB.prepare(
      `INSERT INTO audit_log
         (audit_id, actor, role, method, path, service, status, latency_ms, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newPrefixedUlid("aud"),
        row.identity.actor,
        row.identity.role,
        row.method,
        row.path,
        row.service,
        row.status,
        row.latencyMs,
        row.requestId,
      )
      .run();
  } catch (cause) {
    // The trail is honest about its own gaps: a dropped write is logged,
    // never silently swallowed (Analytics Engine counter arrives with the
    // telemetry work).
    createLogger({
      service: "demerzel",
      environment: env.ENVIRONMENT,
    }).error("audit write dropped", {
      requestId: row.requestId,
      reason: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

/** Mutating methods are audited; reads are logged, not audited. */
export function isAuditable(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}
