#!/usr/bin/env bun
/**
 * `bun run dev`
 *
 * Starts `wrangler dev` for every app at once. Wrangler's local dev
 * registry connects the service bindings between the running sessions,
 * and Miniflare simulates DO, D1, R2, KV, Queues and Workflows, so the
 * whole stack runs locally with no Cloudflare resources
 * (docs/12-deployment.md).
 *
 * Cloudflare Access is not in the local path: Demerzel substitutes a stub
 * identity in dev, and only in dev.
 */
import { DEPLOY_ORDER, SERVICES } from "@seldon/foundation";
import { heading, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";

const PORTS: Record<string, number> = {
  radiant: 8791,
  encyclopedia: 8792,
  vault: 8793,
  psychohistory: 8794,
  "second-foundation": 8795,
  demerzel: 8796,
  terminus: 8787,
};

/** Each session needs its own inspector port; they all default to 9229. */
const inspectorPort = (port: number) => port + 1000;

heading("Starting the local stack");

const children = DEPLOY_ORDER.map((service) => {
  const port = PORTS[service] ?? 0;
  step(`${SERVICES[service].properName} on :${port}`);
  return Bun.spawn(
    [
      "bunx",
      "wrangler",
      "dev",
      "--port",
      String(port),
      "--inspector-port",
      String(inspectorPort(port)),
      "--local",
    ],
    {
      cwd: `${REPO_ROOT}apps/${service}`,
      stdout: "inherit",
      stderr: "inherit",
    },
  );
});

console.log(
  [
    "",
    `   Console:  http://localhost:${PORTS.terminus}`,
    `   Gateway:  http://localhost:${PORTS.demerzel}`,
    "",
    "   Terminus proxies /api to the gateway, so the console is",
    "   same-origin locally exactly as it is in staging.",
    "   Run `bun run --cwd apps/terminus dev:web` alongside this for",
    "   hot module reload while working on the SPA.",
    "",
  ].join("\n"),
);

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.all(children.map((child) => child.exited));
