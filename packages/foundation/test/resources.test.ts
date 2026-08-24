import { describe, expect, it } from "vitest";
import { ENVIRONMENTS } from "../src/environment.js";
import {
  inventory,
  RESOURCES,
  resourceName,
  workerName,
} from "../src/resources.js";
import { DEPLOY_ORDER, SERVICE_NAMES, SERVICES } from "../src/services.js";

describe("naming", () => {
  it("suffixes every environment, production included", () => {
    expect(workerName("radiant", "staging")).toBe("seldon-radiant-staging");
    expect(workerName("radiant", "production")).toBe(
      "seldon-radiant-production",
    );
    expect(resourceName("vault-db", "production")).toBe(
      "seldon-vault-db-production",
    );
  });

  it("keeps the environment out of every binding name", () => {
    for (const resources of Object.values(RESOURCES)) {
      const bindings = [
        ...resources.d1,
        ...resources.r2,
        ...resources.kv,
        ...resources.queues,
        ...resources.workflows,
        ...resources.durableObjects,
      ].map((spec) => spec.binding);
      for (const binding of bindings) {
        expect(binding).toMatch(/^[A-Z][A-Z0-9_]*$/);
        for (const env of ENVIRONMENTS) {
          expect(binding.toLowerCase()).not.toContain(env);
        }
      }
    }
  });
});

describe("service registry", () => {
  it("exposes exactly two public services", () => {
    const publicServices = SERVICE_NAMES.filter((n) => SERVICES[n].isPublic);
    expect(publicServices).toEqual(["demerzel", "terminus"]);
  });

  it("deploys in the documented order, consoles last", () => {
    expect(DEPLOY_ORDER).toEqual([
      "radiant",
      "encyclopedia",
      "vault",
      "psychohistory",
      "second-foundation",
      "demerzel",
      "terminus",
    ]);
  });

  it("deploys the gateway after everything it routes to", () => {
    const position = new Map(DEPLOY_ORDER.map((name, i) => [name, i]));
    for (const dependency of RESOURCES.demerzel.services) {
      expect(position.get(dependency)).toBeLessThan(
        position.get("demerzel") ?? -1,
      );
    }
    expect(position.get("demerzel")).toBeLessThan(
      position.get("terminus") ?? -1,
    );
  });

  it("keeps the one binding cycle visible, since it cannot be ordered away", () => {
    // Radiant reads a dossier's leanings from Vault; Vault records a run
    // into Psychohistory; Psychohistory reads cells back from Radiant.
    // No deploy order satisfies that, so the deploy script makes a second
    // pass on a cold environment instead of pretending otherwise.
    expect(RESOURCES.radiant.services).toContain("vault");
    expect(RESOURCES.vault.services).toContain("psychohistory");
    expect(RESOURCES.psychohistory.services).toContain("radiant");
  });

  it("gives every internal service an RPC entrypoint", () => {
    for (const name of SERVICE_NAMES) {
      const service = SERVICES[name];
      if (service.isPublic) continue;
      expect(service.entrypoint).toBeTruthy();
      expect(service.rpcBinding).toBeTruthy();
    }
  });
});

describe("inventory", () => {
  it("lists each physical resource once per environment", () => {
    const staging = inventory("staging");
    expect(staging.d1Databases).toEqual([
      "seldon-demerzel-db-staging",
      "seldon-encyclopedia-db-staging",
      "seldon-radiant-db-staging",
      "seldon-vault-db-staging",
    ]);
    // RUN_BUCKET is bound by two services; it is provisioned once.
    expect(staging.r2Buckets).toEqual([
      "seldon-datasets-staging",
      "seldon-epochs-staging",
      "seldon-runs-staging",
      "seldon-tiles-staging",
    ]);
    expect(staging.queues).toContain("seldon-sim-tasks-dlq-staging");
  });
});
