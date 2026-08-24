import type {
  EncyclopediaRpc,
  PsychohistoryRpc,
  RadiantRpc,
  SeldonEnvironment,
  VaultRpc,
} from "@seldon/foundation";

export interface SecondFoundationEnv {
  ENVIRONMENT: SeldonEnvironment;
  BUILD_VERSION: string;

  RADIANT: RadiantRpc;
  VAULT: VaultRpc;
  ENCYCLOPEDIA: EncyclopediaRpc;
  PSYCHOHISTORY: PsychohistoryRpc;
}
