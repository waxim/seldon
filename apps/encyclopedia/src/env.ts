import type { SeldonEnvironment } from "@seldon/foundation";

export interface EncyclopediaEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;

  ENCYCLOPEDIA_DB: D1Database;
  DATASETS_BUCKET: R2Bucket;
  POLLS_KV: KVNamespace;
  INGEST_WF: Workflow;
}
