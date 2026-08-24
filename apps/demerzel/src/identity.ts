/**
 * Verified identity → role (docs/11-api.md).
 *
 * Three roles; authenticated but unmapped identities are denied. The map
 * is owner-managed configuration, not a secret, so it lives in `vars`.
 */
import { SeldonError } from "@seldon/foundation";
import { verifyAccessJwt } from "./access.js";
import type { DemerzelEnv } from "./env.js";

export const ROLES = ["viewer", "operator", "owner"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { viewer: 1, operator: 2, owner: 3 };

export interface Identity {
  actor: string;
  role: Role;
  origin: "console" | "client" | "service-token" | "dev-stub";
}

export function parseRoleMap(raw: string): Record<string, Role> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "{}");
  } catch (cause) {
    throw new SeldonError("internal", "ROLE_MAP is not valid JSON", { cause });
  }
  const map: Record<string, Role> = {};
  for (const [actor, role] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    if (!(ROLES as readonly string[]).includes(String(role))) {
      throw new SeldonError("internal", `ROLE_MAP has unknown role ${role}`);
    }
    map[actor.toLowerCase()] = role as Role;
  }
  return map;
}

export async function resolveIdentity(
  request: Request,
  env: DemerzelEnv,
): Promise<Identity> {
  // Cloudflare Access is not in the local path, so dev — and only dev —
  // substitutes a stub identity (docs/12-deployment.md).
  if (env.ENVIRONMENT === "dev") {
    return { actor: "dev@localhost", role: "owner", origin: "dev-stub" };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    throw new SeldonError("unauthenticated", "no Access assertion on request");
  }

  const payload = await verifyAccessJwt(token, {
    teamDomain: env.ACCESS_TEAM_DOMAIN,
    aud: env.ACCESS_AUD,
    kv: env.FLAGS_KV,
  });

  const actor = payload.email ?? payload.common_name ?? payload.sub;
  const role = parseRoleMap(env.ROLE_MAP)[actor.toLowerCase()];
  if (!role) {
    throw new SeldonError(
      "forbidden",
      `identity ${actor} is authenticated but not in the role map`,
    );
  }
  return {
    actor,
    role,
    origin: payload.email ? "console" : "service-token",
  };
}

export function requireRole(identity: Identity, minimum: Role): void {
  if (RANK[identity.role] < RANK[minimum]) {
    throw new SeldonError(
      "forbidden",
      `${minimum} role required; ${identity.actor} is ${identity.role}`,
    );
  }
}
