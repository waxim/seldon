/**
 * Service-binding stubs for the test runtime.
 *
 * A service binding points at another deployed Worker by name, which
 * nothing resolves inside a single-app test runtime. Rather than mock the
 * binding away, each app's tests run against a real auxiliary Worker that
 * implements the same RPC contract as the service it stands in for — so a
 * call that would fail in production (wrong method, wrong shape) still
 * fails here.
 *
 * Plain ESM on purpose: Vitest loads config files in Node, which cannot
 * import the workspace packages' TypeScript source. `bun run test` in
 * `scripts/` asserts this file's entrypoint names still match the service
 * registry in `@seldon/foundation`.
 */

/** service name → { entrypoint class, extra RPC methods }. */
const STUBS = {
  radiant: {
    entrypoint: "RadiantEntrypoint",
    methods: `
    async listWorlds() {
      return [
        { worldId: "uk", name: "United Kingdom", epochId: null, seatCount: 650 },
      ];
    }
    async describeShardFor(entityId) {
      return { shard: entityId, schemaVersion: 1, epochId: null };
    }`,
  },
  vault: {
    entrypoint: "VaultEntrypoint",
    methods: `
    async listRuns() {
      return [];
    }`,
  },
  encyclopedia: {
    entrypoint: "EncyclopediaEntrypoint",
    methods: `
    async listSources() {
      return [];
    }`,
  },
  psychohistory: {
    entrypoint: "PsychohistoryEntrypoint",
    methods: `
    async engineVersion() {
      return "0.0.0-stub";
    }
    async runProgress(runId) {
      return { runId, status: "idle", seatsTotal: 0, seatsDone: 0, seq: 0 };
    }`,
  },
  "second-foundation": {
    entrypoint: "SecondFoundationEntrypoint",
    methods: `
    async watch() {
      return [];
    }`,
  },
  demerzel: { entrypoint: null, methods: "" },
};

function stubScript(service) {
  const stub = STUBS[service];
  if (!stub) throw new Error(`no test stub for service ${service}`);
  if (!stub.entrypoint) {
    return `export default {
  fetch() {
    return Response.json({
      service: ${JSON.stringify(service)},
      status: "ok",
      environment: "dev",
      version: "test-stub",
    });
  },
};
`;
  }
  return `import { WorkerEntrypoint } from "cloudflare:workers";

export class ${stub.entrypoint} extends WorkerEntrypoint {
  async health() {
    return {
      service: ${JSON.stringify(service)},
      status: "ok",
      environment: "dev",
      version: "test-stub",
    };
  }
${stub.methods}
}

export default {
  fetch() {
    return new Response("test stub: no public routes", { status: 404 });
  },
};
`;
}

/**
 * Auxiliary Workers for every service the app under test binds to, named
 * exactly as its `wrangler.jsonc` dev block expects.
 *
 * @param {string[]} services
 * @param {{ date: string, flags: string[] }} compatibility
 */
export function serviceStubWorkers(services, compatibility) {
  return services.map((service) => ({
    name: `seldon-${service}-dev`,
    modules: [
      { type: "ESModule", path: "stub.js", contents: stubScript(service) },
    ],
    compatibilityDate: compatibility.date,
    compatibilityFlags: compatibility.flags,
  }));
}
