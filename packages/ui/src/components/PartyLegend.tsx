import { cn } from "../lib/cn.js";

export interface LegendParty {
  readonly code: string;
  readonly name: string;
  readonly colour: string;
}

export interface PartyLegendProps {
  readonly parties: readonly LegendParty[];
  readonly className?: string;
}

/**
 * Colour is never the only channel: every swatch is paired with the
 * party's name, and the swatch carries a hairline halo so it holds its
 * 3:1 against `--void` even where the party's own colour does not
 * (docs/09-terminus.md, accessibility).
 */
export function PartyLegend({ parties, className }: PartyLegendProps) {
  return (
    <ul className={cn("m-0 flex flex-wrap gap-x-4 gap-y-2 p-0", className)}>
      {parties.map((party) => (
        <li
          key={party.code}
          className="flex list-none items-center gap-2 text-sm"
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[3px] ring-1 ring-hairline-strong"
            style={{ backgroundColor: party.colour }}
          />
          <span className="text-ink-muted">{party.name}</span>
          <span className="font-mono text-xs text-ink-faint">{party.code}</span>
        </li>
      ))}
    </ul>
  );
}
