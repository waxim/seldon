/**
 * The route registry — each route declared once, as data, with Zod
 * schemas (docs/11-api.md).
 *
 * Demerzel implements against these declarations, `@seldon/client` calls
 * them, and the OpenAPI document is derived from them, so a handler that
 * drifts from its schema fails typecheck rather than production. The
 * registry is hand-written at P0 and holds only the walking-skeleton
 * routes; generation of the client and the OpenAPI document from it
 * arrives with the first real domain routes.
 */
import { type ErrorCode, HealthReportSchema } from "@seldon/foundation";
import { z } from "zod";

export type Role = "viewer" | "operator" | "owner";

export interface RouteDefinition<
  Params extends z.ZodTypeAny = z.ZodTypeAny,
  Response extends z.ZodTypeAny = z.ZodTypeAny,
> {
  readonly method: "get" | "post" | "patch" | "delete";
  readonly path: string;
  readonly params: Params;
  readonly response: Response;
  readonly errors: readonly ErrorCode[];
  /** Minimum role, surfaced in OpenAPI and the generated client. */
  readonly role: Role;
  readonly summary: string;
}

function route<Params extends z.ZodTypeAny, Response extends z.ZodTypeAny>(
  definition: RouteDefinition<Params, Response>,
): RouteDefinition<Params, Response> {
  return definition;
}

export const WorldSummarySchema = z.object({
  worldId: z.string(),
  name: z.string(),
  /** Live epoch, once there is one to point at. */
  epochId: z.string().nullable(),
  seatCount: z.number().int(),
});

export type WorldSummary = z.infer<typeof WorldSummarySchema>;

export const ROUTES = {
  health: route({
    method: "get",
    path: "/healthz",
    params: z.object({}),
    response: HealthReportSchema,
    errors: ["unavailable"],
    role: "viewer",
    summary: "Shallow health of the gateway itself",
  }),
  deepHealth: route({
    method: "get",
    path: "/healthz/deep",
    params: z.object({}),
    response: HealthReportSchema,
    errors: ["unavailable", "upstream_error"],
    role: "viewer",
    summary: "Every service's RPC health, walked over service bindings",
  }),
  listWorlds: route({
    method: "get",
    path: "/worlds",
    params: z.object({}),
    response: z.object({ items: z.array(WorldSummarySchema) }),
    errors: ["upstream_error"],
    role: "viewer",
    summary: "Worlds known to Radiant",
  }),
} as const;

export type RouteName = keyof typeof ROUTES;
