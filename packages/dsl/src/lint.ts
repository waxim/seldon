/**
 * Field-level lint for predicate source.
 *
 * P0 scaffolding: the grammar, parser and evaluator sketched in
 * docs/06-scenarios.md land with the DSL build. What exists here is the
 * half that has to exist from day one — every identifier in a predicate
 * is checked against the typed registry, so an unknown field is a typed
 * error with a position and a suggestion rather than a silent empty
 * match.
 */
import { SeldonError } from "@seldon/foundation";
import {
  type FieldDefinition,
  type FieldRegistry,
  suggestField,
} from "./registry.js";

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

export interface FieldReference {
  readonly name: string;
  readonly position: SourcePosition;
  readonly definition: FieldDefinition | undefined;
}

/** Identifiers that are grammar, not fields. */
const KEYWORDS = new Set(["in", "true", "false"]);

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

/**
 * Every identifier in the source that sits in a field position, with its
 * registry definition when it has one.
 *
 * Enum values are bare tokens in this grammar (`tenure == social-rent`),
 * so an identifier immediately preceded by a comparator or `[` is a
 * value, not a field, and is skipped here — value checking belongs to the
 * parser, which knows the field it is comparing against.
 */
export function fieldReferences(
  registry: FieldRegistry,
  source: string,
): FieldReference[] {
  const masked = source.replace(STRING_LITERAL, (match) =>
    " ".repeat(match.length),
  );
  const references: FieldReference[] = [];

  IDENTIFIER.lastIndex = 0;
  for (const match of masked.matchAll(IDENTIFIER)) {
    const name = match[0];
    const index = match.index;
    if (KEYWORDS.has(name)) continue;
    // `50k` / `2m` — a magnitude suffix, not an identifier.
    if (/\d/.test(masked[index - 1] ?? "")) continue;
    if (isValuePosition(masked, index)) continue;
    references.push({
      name,
      position: positionOf(source, index),
      definition: registry.fields.get(name),
    });
  }
  return references;
}

/**
 * Lint a predicate's fields. Returns one `dsl_error` per unknown field,
 * carrying the position and the suggestion the API contract promises
 * (docs/11-api.md).
 */
export function lintFields(
  registry: FieldRegistry,
  source: string,
): SeldonError[] {
  return fieldReferences(registry, source)
    .filter((reference) => reference.definition === undefined)
    .map((reference) => {
      const suggestion = suggestField(registry, reference.name);
      return new SeldonError(
        "dsl_error",
        `unknown field '${reference.name}' in predicate`,
        {
          details: {
            position: reference.position,
            ...(suggestion === undefined ? {} : { suggestion }),
          },
        },
      );
    });
}

/** Throw on the first unknown field — the compile-error path. */
export function assertFieldsKnown(
  registry: FieldRegistry,
  source: string,
): void {
  const [first] = lintFields(registry, source);
  if (first) throw first;
}

function isValuePosition(source: string, index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0 && source[cursor] === " ") cursor--;
  if (cursor < 0) return false;
  const previous = source[cursor];
  if (previous === "[" || previous === ",") return true;
  if (previous === "=" || previous === "<" || previous === ">") return true;
  if (previous === "-") return true; // inside a hyphenated token
  // `field in [...]` — the token after `in` is a value.
  return /(?:^|[\s(!])in$/.test(source.slice(0, cursor + 1));
}

function positionOf(source: string, index: number): SourcePosition {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: index - lastNewline };
}
