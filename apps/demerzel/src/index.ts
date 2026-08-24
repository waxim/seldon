/**
 * Demerzel — the one public API (docs/11-api.md).
 *
 * Validates the Access assertion on every request, maps identity to a
 * role, routes to internal services over service bindings, stamps a
 * request id, and writes the audit trail.
 */

import { ROUTES } from "@seldon/client/routes";
import {
  createLogger,
  type HealthReport,
  healthReport,
  newPrefixedUlid,
  SELDON_VERSION,
  SeldonError,
} from "@seldon/foundation";
import { Hono } from "hono";
import { isAuditable, writeAudit } from "./audit.js";
import type { DemerzelEnv } from "./env.js";
import { type Identity, resolveIdentity } from "./identity.js";

type Variables = { identity: Identity; requestId: string };

const app = new Hono<{ Bindings: DemerzelEnv; Variables: Variables }>();

app.use("*", async (context, next) => {
  const requestId = `req_${newPrefixedUlid("aud").slice(4)}`;
  const started = Date.now();
  context.set("requestId", requestId);
  context.header("Seldon-Request-Id", requestId);
  context.header("Seldon-Api-Version", context.env.BUILD_VERSION);

  try {
    context.set(
      "identity",
      await resolveIdentity(context.req.raw, context.env),
    );
    await next();
  } catch (thrown) {
    const error = SeldonError.from(thrown);
    createLogger({
      service: "demerzel",
      environment: context.env.ENVIRONMENT,
    }).error("request failed", {
      requestId,
      code: error.code,
      path: context.req.path,
      message: error.message,
    });
    context.res = Response.json(error.toWire(requestId), {
      status: error.httpStatus,
      headers: {
        "Seldon-Request-Id": requestId,
        "Seldon-Api-Version": context.env.BUILD_VERSION,
      },
    });
  }

  const identity = context.get("identity");
  if (identity && isAuditable(context.req.method)) {
    context.executionCtx.waitUntil(
      writeAudit(context.env, {
        identity,
        method: context.req.method,
        path: context.req.path,
        service: "demerzel",
        status: context.res.status,
        latencyMs: Date.now() - started,
        requestId,
      }),
    );
  }
});

app.get(ROUTES.health.path, (context) =>
  context.json(
    healthReport(
      "demerzel",
      context.env.ENVIRONMENT,
      context.env.BUILD_VERSION,
    ),
  ),
);

app.get(ROUTES.deepHealth.path, async (context) => {
  const services = {
    radiant: context.env.RADIANT,
    vault: context.env.VAULT,
    encyclopedia: context.env.ENCYCLOPEDIA,
    psychohistory: context.env.PSYCHOHISTORY,
    "second-foundation": context.env.SECOND_FOUNDATION,
  };

  const checks = await Promise.all(
    Object.entries(services).map(async ([name, binding]) => {
      try {
        const report: HealthReport = await binding.health();
        return {
          name,
          status: report.status,
          detail: `${report.service}@${report.version}`,
        };
      } catch (cause) {
        return {
          name,
          status: "failing" as const,
          detail: cause instanceof Error ? cause.message : String(cause),
        };
      }
    }),
  );

  const report = healthReport(
    "demerzel",
    context.env.ENVIRONMENT,
    context.env.BUILD_VERSION,
    checks,
  );
  return context.json(report, report.status === "ok" ? 200 : 503);
});

app.get(ROUTES.listWorlds.path, async (context) => {
  try {
    const items = await context.env.RADIANT.listWorlds();
    return context.json({ items });
  } catch (cause) {
    throw new SeldonError("upstream_error", "radiant call failed", { cause });
  }
});

/** The contract artefact. Generated from the route registry in P1. */
app.get("/openapi.json", (context) =>
  context.json({
    openapi: "3.1.0",
    info: { title: "Seldon", version: SELDON_VERSION },
    paths: Object.fromEntries(
      Object.values(ROUTES).map((route) => [
        route.path,
        {
          [route.method]: {
            summary: route.summary,
            "x-seldon-role": route.role,
          },
        },
      ]),
    ),
  }),
);

app.notFound((context) => {
  const error = new SeldonError(
    "not_found",
    `no route for ${context.req.method} ${context.req.path}`,
  );
  return context.json(error.toWire(context.get("requestId")), 404);
});

export default app;
