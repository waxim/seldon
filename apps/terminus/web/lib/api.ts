import { createClient, type WorldSummary } from "@seldon/client";
import type { HealthReport } from "@seldon/foundation";
import { queryOptions } from "@tanstack/react-query";

/**
 * `@seldon/client` is the only way Terminus talks to the system — no
 * hand-rolled fetches, so the route registry stays the contract
 * (docs/09-terminus.md). Streaming updates will merge into this same
 * cache when the run socket lands in P3.
 */
export const client = createClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

export const healthQuery = queryOptions<HealthReport>({
  queryKey: ["health", "deep"],
  queryFn: () => client.deepHealth(),
  staleTime: 30_000,
  retry: 1,
});

export const worldsQuery = queryOptions<WorldSummary[]>({
  queryKey: ["worlds"],
  queryFn: () => client.worlds.list(),
  staleTime: 5 * 60_000,
  retry: 1,
});
