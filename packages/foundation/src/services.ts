/**
 * The service registry: the seven Workers of docs/03-architecture.md.
 *
 * One table, used by app code, the deploy scripts and `infra/` alike, so
 * a service's name, its public exposure and its deploy position can never
 * drift between them.
 */

export const SERVICE_NAMES = [
  "radiant",
  "encyclopedia",
  "vault",
  "psychohistory",
  "second-foundation",
  "demerzel",
  "terminus",
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface ServiceDefinition {
  /** Directory under `apps/`, and the lowercase form used in names. */
  readonly name: ServiceName;
  /** Proper noun, as written in prose (docs/02-lexicon.md). */
  readonly properName: string;
  /** One line: what this service owns. */
  readonly owns: string;
  /** Publicly routable behind Cloudflare Access? Only two are. */
  readonly isPublic: boolean;
  /**
   * Deploy position (docs/12-deployment.md). Leaves first, gateway after
   * everything it routes to, console last.
   *
   * The domain graph has one genuine cycle — Radiant reads leanings from
   * Vault, Vault records runs into Psychohistory, Psychohistory reads
   * cells from Radiant — so no order resolves every binding on a
   * first-ever deploy into an empty environment. `scripts/deploy.ts`
   * makes a second pass for that case rather than pretending the graph is
   * a tree.
   */
  readonly deployOrder: number;
  /** The WorkerEntrypoint class other services call over RPC. */
  readonly entrypoint: string | null;
  /** Binding name other services use for this one (plain service name). */
  readonly rpcBinding: string | null;
}

export const SERVICES: Record<ServiceName, ServiceDefinition> = {
  radiant: {
    name: "radiant",
    properName: "Radiant",
    owns: "worlds, the canon replica, epochs, forks, layers, cells, dossiers",
    isPublic: false,
    deployOrder: 10,
    entrypoint: "RadiantEntrypoint",
    rpcBinding: "RADIANT",
  },
  encyclopedia: {
    name: "encyclopedia",
    properName: "Encyclopedia",
    owns: "source manifests, ingestion, the catalogue, data versions",
    isPublic: false,
    deployOrder: 10,
    entrypoint: "EncyclopediaEntrypoint",
    rpcBinding: "ENCYCLOPEDIA",
  },
  vault: {
    name: "vault",
    properName: "Vault",
    owns: "scenarios, questions, runs, outcomes — the archive",
    isPublic: false,
    deployOrder: 20,
    entrypoint: "VaultEntrypoint",
    rpcBinding: "VAULT",
  },
  psychohistory: {
    name: "psychohistory",
    properName: "Psychohistory",
    owns: "the engine: plan compilation, fan-out, aggregation",
    isPublic: false,
    deployOrder: 30,
    entrypoint: "PsychohistoryEntrypoint",
    rpcBinding: "PSYCHOHISTORY",
  },
  "second-foundation": {
    name: "second-foundation",
    properName: "Second Foundation",
    owns: "calibration, backtests, drift and freshness watch",
    isPublic: false,
    deployOrder: 40,
    entrypoint: "SecondFoundationEntrypoint",
    rpcBinding: "SECOND_FOUNDATION",
  },
  demerzel: {
    name: "demerzel",
    properName: "Demerzel",
    owns: "the one public API: auth, routing, rate limits, audit",
    isPublic: true,
    deployOrder: 50,
    entrypoint: null,
    rpcBinding: null,
  },
  terminus: {
    name: "terminus",
    properName: "Terminus",
    owns: "the console: the entire UI",
    isPublic: true,
    deployOrder: 60,
    entrypoint: null,
    rpcBinding: null,
  },
};

/** Services in deploy order — leaves first, console last. */
export const DEPLOY_ORDER: readonly ServiceName[] = [...SERVICE_NAMES].sort(
  (a, b) => SERVICES[a].deployOrder - SERVICES[b].deployOrder,
);

export function isServiceName(value: string): value is ServiceName {
  return (SERVICE_NAMES as readonly string[]).includes(value);
}
