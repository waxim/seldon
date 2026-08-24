import { describe, expect, it } from "vitest";
import { createLogger } from "../src/log.js";

describe("createLogger", () => {
  it("emits one JSON object per line with service context", () => {
    const lines: string[] = [];
    const log = createLogger({
      service: "radiant",
      environment: "dev",
      sink: (line) => lines.push(line),
    });
    log.info("epoch published", { epochId: "ep_5f9c2a1d44e0" });
    expect(JSON.parse(lines[0] ?? "{}")).toEqual({
      level: "info",
      message: "epoch published",
      service: "radiant",
      environment: "dev",
      epochId: "ep_5f9c2a1d44e0",
    });
  });

  it("drops lines below the configured level", () => {
    const lines: string[] = [];
    const log = createLogger({
      service: "vault",
      environment: "dev",
      level: "warn",
      sink: (line) => lines.push(line),
    });
    log.info("quiet");
    log.error("loud");
    expect(lines).toHaveLength(1);
  });

  it("inherits fields in a child logger", () => {
    const lines: string[] = [];
    const log = createLogger({
      service: "demerzel",
      environment: "dev",
      sink: (line) => lines.push(line),
    }).with({ requestId: "req_01j9ab7f" });
    log.info("routed");
    expect(JSON.parse(lines[0] ?? "{}").requestId).toBe("req_01j9ab7f");
  });
});
