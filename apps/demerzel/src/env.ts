import type {
  EncyclopediaRpc,
  PsychohistoryRpc,
  RadiantRpc,
  SecondFoundationRpc,
  SeldonEnvironment,
  VaultRpc,
} from "@seldon/foundation";

export interface DemerzelEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;
  /** `<team>.cloudflareaccess.com` — the Access team domain. */
  ACCESS_TEAM_DOMAIN: string;
  /** The Access application audience tag this gateway accepts. */
  ACCESS_AUD: string;
  /** Owner-managed identity → role map, as JSON (docs/11-api.md). */
  ROLE_MAP: string;

  DEMERZEL_DB: D1Database;
  FLAGS_KV: KVNamespace;

  RADIANT: RadiantRpc;
  VAULT: VaultRpc;
  ENCYCLOPEDIA: EncyclopediaRpc;
  PSYCHOHISTORY: PsychohistoryRpc;
  SECOND_FOUNDATION: SecondFoundationRpc;
}
