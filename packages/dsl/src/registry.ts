/**
 * The typed field registry — the whole point of the DSL
 * (docs/06-scenarios.md).
 *
 * A field that is not in this registry is a compile error, never an empty
 * match: the v1 footgun where `agee > 50` silently matched nobody is
 * structurally impossible. Registries are world-scoped, so a second world
 * ships its own field set behind the same grammar.
 */
import type { WorldId } from "@seldon/foundation";

export type FieldType = "enum" | "number" | "boolean";

/** Which axis of the replica a field describes. */
export type FieldAxis = "person" | "household" | "area" | "seat";

/** Where the value comes from (docs/04-population.md layer semantics). */
export type FieldLayer =
  | "census"
  | "modelled"
  | "contextual"
  | "spine"
  | "derived"
  | "reference";

interface FieldBase {
  readonly name: string;
  readonly axis: FieldAxis;
  readonly layer: FieldLayer;
  readonly description: string;
}

export interface EnumField extends FieldBase {
  readonly type: "enum";
  readonly values: readonly string[];
  /** True when the value set is only known once data is loaded. */
  readonly openSet?: boolean;
}

export interface NumberField extends FieldBase {
  readonly type: "number";
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
}

export interface BooleanField extends FieldBase {
  readonly type: "boolean";
  /** Sugar fields expand to another predicate at compile time. */
  readonly sugarFor?: string;
}

export type FieldDefinition = EnumField | NumberField | BooleanField;

export interface FieldRegistry {
  readonly worldId: string;
  /** Bumped with the epoch schema the registry describes. */
  readonly version: number;
  readonly fields: ReadonlyMap<string, FieldDefinition>;
}

const UK_FIELD_LIST: readonly FieldDefinition[] = [
  {
    name: "sex",
    type: "enum",
    axis: "person",
    layer: "census",
    values: ["male", "female"],
    description: "Census sex classification",
  },
  {
    name: "age",
    type: "number",
    axis: "person",
    layer: "census",
    min: 18,
    max: 105,
    unit: "years",
    description: "Age in years; the replica holds adults",
  },
  {
    name: "ageBand",
    type: "enum",
    axis: "person",
    layer: "census",
    values: ["18-24", "25-34", "35-49", "50-64", "65-74", "75+"],
    description: "Banded age; quote tokens that start with a digit",
  },
  {
    name: "qualification",
    type: "enum",
    axis: "person",
    layer: "census",
    values: [
      "none",
      "level1",
      "level2",
      "apprenticeship",
      "level3",
      "level4plus",
    ],
    description: "Highest qualification",
  },
  {
    name: "degree",
    type: "boolean",
    axis: "person",
    layer: "census",
    sugarFor: "qualification == level4plus",
    description: "Sugar for qualification == level4plus",
  },
  {
    name: "activity",
    type: "enum",
    axis: "person",
    layer: "census",
    values: [
      "employed",
      "self-employed",
      "unemployed",
      "student",
      "retired",
      "inactive",
    ],
    description: "Economic activity",
  },
  {
    name: "registered",
    type: "boolean",
    axis: "person",
    layer: "modelled",
    description: "On the electoral roll (modelled)",
  },
  {
    name: "income",
    type: "number",
    axis: "person",
    layer: "modelled",
    min: 0,
    unit: "£/year",
    description: "Modelled personal income",
  },
  {
    name: "tenure",
    type: "enum",
    axis: "household",
    layer: "census",
    values: ["owned", "mortgage", "social-rent", "private-rent"],
    description: "Household tenure",
  },
  {
    name: "householdSize",
    type: "number",
    axis: "household",
    layer: "census",
    min: 1,
    max: 8,
    description: "People in the household",
  },
  {
    name: "housePriceBand",
    type: "enum",
    axis: "household",
    layer: "modelled",
    values: ["q1", "q2", "q3", "q4", "q5"],
    description: "Modelled house-price quintile band",
  },
  {
    name: "energyBand",
    type: "enum",
    axis: "household",
    layer: "modelled",
    values: ["a", "b", "c", "d", "e", "f", "g"],
    description: "Modelled EPC band",
  },
  {
    name: "deprivation",
    type: "number",
    axis: "area",
    layer: "contextual",
    min: 1,
    max: 5,
    description: "IMD quintile, 1 = most deprived",
  },
  {
    name: "urbanRural",
    type: "enum",
    axis: "area",
    layer: "contextual",
    values: ["major-urban", "urban", "town", "village", "rural"],
    description: "Urban–rural classification",
  },
  {
    name: "seat",
    type: "enum",
    axis: "seat",
    layer: "spine",
    values: [],
    openSet: true,
    description: "Constituency slug or ONS code; values come from the spine",
  },
  {
    name: "region",
    type: "enum",
    axis: "seat",
    layer: "spine",
    values: [
      "north-east",
      "north-west",
      "yorkshire-and-the-humber",
      "east-midlands",
      "west-midlands",
      "east-of-england",
      "london",
      "south-east",
      "south-west",
      "scotland",
      "wales",
      "northern-ireland",
    ],
    description: "Government office region (plus the devolved nations)",
  },
  {
    name: "nation",
    type: "enum",
    axis: "seat",
    layer: "spine",
    values: ["england", "scotland", "wales", "northern-ireland"],
    description: "Nation of the UK",
  },
  {
    name: "marginality2024",
    type: "number",
    axis: "seat",
    layer: "derived",
    min: 0,
    max: 1,
    description: "2024 winning margin as a share",
  },
  {
    name: "incumbent",
    type: "enum",
    axis: "seat",
    layer: "derived",
    values: [],
    openSet: true,
    description: "Party holding the seat; values come from @seldon/parties",
  },
  {
    name: "redWall",
    type: "boolean",
    axis: "seat",
    layer: "reference",
    description: "Committed reference list in @seldon/geo",
  },
  {
    name: "blueWall",
    type: "boolean",
    axis: "seat",
    layer: "reference",
    description: "Committed reference list in @seldon/geo",
  },
];

export const UK_FIELD_REGISTRY: FieldRegistry = {
  worldId: "uk",
  version: 1,
  fields: new Map(UK_FIELD_LIST.map((field) => [field.name, field])),
};

const REGISTRIES: Record<string, FieldRegistry> = { uk: UK_FIELD_REGISTRY };

export function fieldRegistryFor(worldId: WorldId | string): FieldRegistry {
  const registry = REGISTRIES[worldId];
  if (!registry) {
    throw new Error(`no field registry for world ${worldId}`);
  }
  return registry;
}

export function fieldNames(registry: FieldRegistry): string[] {
  return [...registry.fields.keys()].sort();
}

/** Closest known field name, for the `did you mean` in a dsl_error. */
export function suggestField(
  registry: FieldRegistry,
  unknown: string,
): string | undefined {
  let best: { name: string; distance: number } | undefined;
  for (const name of registry.fields.keys()) {
    const distance = editDistance(unknown.toLowerCase(), name.toLowerCase());
    if (!best || distance < best.distance) best = { name, distance };
  }
  // Two edits on a short identifier is a typo; more is a different word.
  const threshold = Math.max(2, Math.floor(unknown.length / 3));
  return best && best.distance <= threshold ? best.name : undefined;
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution =
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;
      current[j] = Math.min(substitution, deletion, insertion);
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length] ?? Math.max(a.length, b.length);
}
