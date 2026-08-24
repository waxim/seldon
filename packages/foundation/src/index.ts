/**
 * `@seldon/foundation` — the shared core everything is built on.
 *
 * Domain types, branded ids, the error taxonomy, the environment and
 * service registries, the resource/binding table, the health contract and
 * the structured logger. Nothing here talks to a network or a store: it
 * is the vocabulary the rest of the monorepo agrees on.
 */
export * from "./environment.js";
export * from "./errors.js";
export * from "./health.js";
export * from "./ids.js";
export * from "./log.js";
export * from "./resources.js";
export * from "./rpc.js";
export * from "./services.js";

/**
 * The engine/API version stamp. Bumped deliberately; CI overrides the
 * build stamp with the deployed commit (see scripts/deploy.ts).
 */
export const SELDON_VERSION = "0.0.0-p0";
