/**
 * `@seldon/parties` — the party registry, per world.
 *
 * The only source of saturated colour on any data surface
 * (docs/09-terminus.md): charts take party colours from here and nowhere
 * else. Aliases exist because published sources spell the same party a
 * dozen ways; historical mappings arrive with the sources that need them
 * (P1).
 */
import type { WorldId } from "@seldon/foundation";

export interface Party {
  /** Stable short code used in shares, cells and outcomes. */
  readonly code: string;
  readonly name: string;
  /** Hex colour, as used by every chart in `@seldon/ui`. */
  readonly colour: string;
  /** Ink colour that meets contrast on `colour`. */
  readonly onColour: "#FFFFFF" | "#171B26";
  /** Nations the party stands in — GSS prefixes it can appear under. */
  readonly nations: readonly ("england" | "scotland" | "wales" | "ni")[];
  readonly aliases: readonly string[];
}

const GB: Party["nations"] = ["england", "scotland", "wales"];

export const UK_PARTIES: readonly Party[] = [
  {
    code: "lab",
    name: "Labour",
    colour: "#E4003B",
    onColour: "#FFFFFF",
    nations: GB,
    aliases: ["labour", "labour party", "lab co-op", "labour and co-operative"],
  },
  {
    code: "con",
    name: "Conservative",
    colour: "#0087DC",
    onColour: "#FFFFFF",
    nations: GB,
    aliases: ["conservative", "conservative and unionist party", "tory"],
  },
  {
    code: "ld",
    name: "Liberal Democrats",
    colour: "#FAA61A",
    onColour: "#171B26",
    nations: GB,
    aliases: ["liberal democrat", "liberal democrats", "lib dem", "libdem"],
  },
  {
    code: "ref",
    name: "Reform UK",
    colour: "#12B6CF",
    onColour: "#171B26",
    nations: GB,
    aliases: ["reform", "reform uk", "brexit party"],
  },
  {
    code: "grn",
    name: "Green",
    colour: "#02A95B",
    onColour: "#FFFFFF",
    nations: ["england", "wales"],
    aliases: ["green", "green party", "green party of england and wales"],
  },
  {
    code: "snp",
    name: "Scottish National Party",
    colour: "#FDF38E",
    onColour: "#171B26",
    nations: ["scotland"],
    aliases: ["snp", "scottish national party"],
  },
  {
    code: "pc",
    name: "Plaid Cymru",
    colour: "#005B54",
    onColour: "#FFFFFF",
    nations: ["wales"],
    aliases: ["plaid", "plaid cymru", "the party of wales"],
  },
  {
    code: "dup",
    name: "Democratic Unionist Party",
    colour: "#D46A4C",
    onColour: "#171B26",
    nations: ["ni"],
    aliases: ["dup", "democratic unionist party"],
  },
  {
    code: "sf",
    name: "Sinn Féin",
    colour: "#326760",
    onColour: "#FFFFFF",
    nations: ["ni"],
    aliases: ["sinn fein", "sinn féin", "sf"],
  },
  {
    code: "sdlp",
    name: "Social Democratic and Labour Party",
    colour: "#2AA82C",
    onColour: "#FFFFFF",
    nations: ["ni"],
    aliases: ["sdlp", "social democratic and labour party"],
  },
  {
    code: "apni",
    name: "Alliance",
    colour: "#F6CB2F",
    onColour: "#171B26",
    nations: ["ni"],
    aliases: ["alliance", "alliance party", "apni"],
  },
  {
    code: "uup",
    name: "Ulster Unionist Party",
    colour: "#48A5EE",
    onColour: "#171B26",
    nations: ["ni"],
    aliases: ["uup", "ulster unionist party"],
  },
  {
    code: "oth",
    name: "Other",
    colour: "#8C93A8",
    onColour: "#171B26",
    nations: ["england", "scotland", "wales", "ni"],
    aliases: ["other", "others", "independent", "ind"],
  },
];

const REGISTRIES: Record<string, readonly Party[]> = { uk: UK_PARTIES };

export function partiesFor(worldId: WorldId | string): readonly Party[] {
  const registry = REGISTRIES[worldId];
  if (!registry) {
    throw new Error(`no party registry for world ${worldId}`);
  }
  return registry;
}

export function partyByCode(
  worldId: WorldId | string,
  code: string,
): Party | undefined {
  return partiesFor(worldId).find((party) => party.code === code);
}

/** Resolve a published source's spelling to a canonical party. */
export function resolveParty(
  worldId: WorldId | string,
  label: string,
): Party | undefined {
  const needle = label.trim().toLowerCase();
  return partiesFor(worldId).find(
    (party) =>
      party.code === needle ||
      party.name.toLowerCase() === needle ||
      party.aliases.includes(needle),
  );
}

export function partyColour(worldId: WorldId | string, code: string): string {
  return partyByCode(worldId, code)?.colour ?? "#8C93A8";
}
