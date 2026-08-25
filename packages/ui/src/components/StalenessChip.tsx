import { Chip, type ChipTone } from "./Chip.js";

export type Freshness = "fresh" | "due" | "stale" | "never";

const LABEL: Record<Freshness, string> = {
  fresh: "fresh",
  due: "due",
  stale: "stale",
  never: "never fetched",
};

const TONE: Record<Freshness, ChipTone> = {
  fresh: "positive",
  due: "radiant",
  stale: "negative",
  never: "outline",
};

export interface StalenessChipProps {
  readonly freshness: Freshness;
  /** What was last seen, in words — "14 Aug 2026", "3 days ago". */
  readonly detail?: string;
}

/**
 * Freshness is surfaced, not silent: anything rendered from data older
 * than its declared cadence wears one of these (docs/09-terminus.md).
 */
export function StalenessChip({ freshness, detail }: StalenessChipProps) {
  return (
    <Chip tone={TONE[freshness]}>
      {LABEL[freshness]}
      {detail ? (
        <span className="text-ink-faint font-mono">{detail}</span>
      ) : null}
    </Chip>
  );
}
