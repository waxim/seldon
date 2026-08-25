const OPERATOR = /(==|!=|>=|<=|[<>]|&&|\|\||\bin\s*\[)/;

/**
 * Does this look like someone typing a predicate rather than a place they
 * want to go? The palette embeds the DSL, so `age > 65` should offer to
 * explore rather than fuzzy-match a section name (docs/09-terminus.md).
 */
export function looksLikePredicate(query: string): boolean {
  return OPERATOR.test(query) || /^!\s*[A-Za-z_]/.test(query.trim());
}
