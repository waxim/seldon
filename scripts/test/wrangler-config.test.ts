import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RESOURCES, SERVICE_NAMES, SERVICES } from "@seldon/foundation";
import { describe, expect, it } from "vitest";
import { parseJsonc, REPO_ROOT } from "../lib/config.js";
import { readAllStackOutputs } from "../lib/stack-outputs.js";
import { buildWranglerConfig } from "../lib/wrangler-config.js";

const committed = (service: string) =>
  parseJsonc<Record<string, never>>(
    readFileSync(join(REPO_ROOT, "apps", service, "wrangler.jsonc"), "utf8"),
  );

describe("generated wrangler configs", () => {
  it("are committed exactly as the resource table generates them", () => {
    const outputs = readAllStackOutputs();
    for (const service of SERVICE_NAMES) {
      expect(committed(service), service).toEqual(
        buildWranglerConfig(service, { outputs }),
      );
    }
  });

  it("name every Worker and resource with its environment suffix", () => {
    for (const service of SERVICE_NAMES) {
      const config = committed(service) as Record<string, never> & {
        env: Record<"staging" | "production", { name: string }>;
      };
      expect(config.env.staging.name).toBe(`seldon-${service}-staging`);
      expect(config.env.production.name).toBe(`seldon-${service}-production`);
    }
  });

  it("gives routes to the two public services and to nobody else", () => {
    for (const service of SERVICE_NAMES) {
      const config = committed(service) as Record<string, never> & {
        env: Record<"staging" | "production", { routes?: unknown[] }>;
      };
      const hasRoutes = Boolean(config.env.staging.routes?.length);
      expect(hasRoutes, service).toBe(SERVICES[service].isPublic);
    }
  });

  it("declares a dead-letter queue for every consumer", () => {
    for (const service of SERVICE_NAMES) {
      const config = committed(service) as Record<string, never> & {
        queues?: { consumers?: { dead_letter_queue?: string }[] };
      };
      for (const consumer of config.queues?.consumers ?? []) {
        expect(consumer.dead_letter_queue, service).toMatch(/-dlq-dev$/);
      }
    }
  });

  it("only SQLite-backs Durable Objects that hold rows", () => {
    const radiant = committed("radiant") as Record<string, never> & {
      migrations: { new_sqlite_classes: string[] }[];
    };
    expect(radiant.migrations[0]?.new_sqlite_classes).toEqual([
      "SeatShard",
      "WorldRegistry",
    ]);
  });
});

describe("test service stubs", () => {
  it("stub every service that anything binds, with the real class name", () => {
    const stubs = readFileSync(
      join(REPO_ROOT, "config", "test-stubs.mjs"),
      "utf8",
    );
    const bound = new Set(
      SERVICE_NAMES.flatMap((service) => [...RESOURCES[service].services]),
    );
    for (const service of bound) {
      expect(stubs, service).toMatch(
        new RegExp(`^\\s*"?${service}"?:\\s*\\{`, "m"),
      );
      const entrypoint = SERVICES[service].entrypoint;
      if (entrypoint) expect(stubs, service).toContain(entrypoint);
    }
  });
});

describe("parseJsonc", () => {
  it("strips comments without touching strings", () => {
    expect(
      parseJsonc<{ url: string; n: number }>(`{
        // a line comment
        "url": "https://example.test/not//a/comment", /* inline */
        "n": 1
      }`),
    ).toEqual({ url: "https://example.test/not//a/comment", n: 1 });
  });
});
