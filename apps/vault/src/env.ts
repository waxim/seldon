import type { PsychohistoryRpc, SeldonEnvironment } from "@seldon/foundation";

export interface VaultEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;

  VAULT_DB: D1Database;
  RUN_BUCKET: R2Bucket;
  PSYCHOHISTORY: PsychohistoryRpc;
}
