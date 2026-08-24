/**
 * `@seldon/geo` — geography: the admin-level abstraction, ONS codes and
 * the lookups built on them.
 *
 * A world declares four admin levels; the UK fills them with nation,
 * region, constituency and output area. Nothing above this package knows
 * that "L3" means "constituency" in the UK — that is the whole point of
 * the abstraction (docs/04-population.md).
 */
import type { SeatId, WorldId } from "@seldon/foundation";

export const ADMIN_LEVELS = ["L1", "L2", "L3", "L4"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export interface AdminLevelDefinition {
  readonly level: AdminLevel;
  readonly name: string;
  /** Roughly how many of these exist — for sanity checks, not truth. */
  readonly approximateCount: number;
}

export interface WorldGeography {
  readonly worldId: string;
  readonly levels: Readonly<Record<AdminLevel, AdminLevelDefinition>>;
  /** The level the population is sharded at (one DO per unit). */
  readonly shardLevel: AdminLevel;
}

export const UK_GEOGRAPHY: WorldGeography = {
  worldId: "uk",
  levels: {
    L1: { level: "L1", name: "nation", approximateCount: 4 },
    L2: { level: "L2", name: "region", approximateCount: 12 },
    L3: { level: "L3", name: "constituency", approximateCount: 650 },
    L4: { level: "L4", name: "output area", approximateCount: 189_000 },
  },
  shardLevel: "L3",
};

const GEOGRAPHIES: Record<string, WorldGeography> = { uk: UK_GEOGRAPHY };

export function geographyFor(worldId: WorldId | string): WorldGeography {
  const geography = GEOGRAPHIES[worldId];
  if (!geography) {
    throw new Error(`no geography for world ${worldId}`);
  }
  return geography;
}

export const NATIONS = ["england", "scotland", "wales", "ni"] as const;
export type Nation = (typeof NATIONS)[number];

/** GSS constituency code prefixes, by nation (2024 boundaries). */
const SEAT_PREFIX_TO_NATION: Record<string, Nation> = {
  E14: "england",
  W07: "wales",
  S14: "scotland",
  N05: "ni",
};

export function nationForSeat(seatId: SeatId | string): Nation {
  const nation = SEAT_PREFIX_TO_NATION[seatId.slice(0, 3)];
  if (!nation) {
    throw new Error(`unrecognised constituency code: ${seatId}`);
  }
  return nation;
}

export const NATION_NAMES: Record<Nation, string> = {
  england: "England",
  scotland: "Scotland",
  wales: "Wales",
  ni: "Northern Ireland",
};

/**
 * The 2024 seat count per nation. Committed as a reference figure so a
 * spine load that disagrees fails loudly rather than quietly reshaping
 * the world (docs/13-roadmap.md, P1 acceptance).
 */
export const UK_SEAT_COUNTS: Readonly<Record<Nation, number>> = {
  england: 543,
  scotland: 57,
  wales: 32,
  ni: 18,
};

export const UK_SEAT_TOTAL = Object.values(UK_SEAT_COUNTS).reduce(
  (a, b) => a + b,
  0,
);
