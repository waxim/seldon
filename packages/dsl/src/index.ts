/**
 * `@seldon/dsl` — the predicate DSL of docs/06-scenarios.md.
 *
 * Shipped so far: the typed, world-scoped field registry and the
 * field-level lint that turns an unknown field into a positional
 * `dsl_error`. The grammar, parser and evaluator follow in the DSL build;
 * the registry is deliberately first, because it is what makes a misspelt
 * field a compile error instead of an empty match.
 */
export * from "./lint.js";
export * from "./registry.js";
