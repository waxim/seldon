/**
 * The matcher behind ⌘K. Subsequence matching with a bias toward hits at
 * word boundaries, so "sf" finds "Second Foundation" and "stroud" would
 * find a seat without the query having to be a prefix.
 */
export interface FuzzyMatch {
  readonly score: number;
  /** Indices in the haystack that the query matched, for highlighting. */
  readonly indices: readonly number[];
}

const BOUNDARY = /[\s\-_/·:.]/;

export function fuzzyMatch(
  haystack: string,
  query: string,
): FuzzyMatch | undefined {
  if (query.length === 0) return { score: 0, indices: [] };

  const target = haystack.toLowerCase();
  const needle = query.toLowerCase().replace(/\s+/g, "");
  const indices: number[] = [];

  let score = 0;
  let cursor = 0;
  let streak = 0;

  for (const character of needle) {
    const found = target.indexOf(character, cursor);
    if (found === -1) return undefined;

    const atStart = found === 0;
    const afterBoundary = found > 0 && BOUNDARY.test(target[found - 1] ?? "");
    const contiguous = found === cursor && indices.length > 0;

    if (atStart) score += 12;
    else if (afterBoundary) score += 8;
    if (contiguous) {
      streak += 1;
      score += 4 + streak;
    } else {
      streak = 0;
      // Distance from where we were reading costs a little.
      score -= Math.min(found - cursor, 6);
    }

    indices.push(found);
    cursor = found + 1;
  }

  // Prefer the tighter of two otherwise equal matches.
  score -= Math.max(0, target.length - needle.length) * 0.05;
  return { score, indices };
}

export interface Ranked<T> {
  readonly item: T;
  readonly score: number;
  readonly indices: readonly number[];
}

export function rankBy<T>(
  items: readonly T[],
  query: string,
  text: (item: T) => string,
): Ranked<T>[] {
  const ranked: Ranked<T>[] = [];
  for (const item of items) {
    const match = fuzzyMatch(text(item), query);
    if (match) {
      ranked.push({ item, score: match.score, indices: match.indices });
    }
  }
  return ranked.sort((a, b) => b.score - a.score);
}
