/**
 * Branded ids — the four id families of docs/10-data-model.md.
 *
 * Ids are branded so a `ForkId` cannot be passed where an `EpochId` is
 * expected, and so a malformed id fails at the Demerzel boundary rather
 * than three services deep.
 */
import { z } from "zod";

export type Brand<T, B extends string> = T & { readonly __brand: B };

/** Crockford base32, lowercase, as written by this repo's ULID helper. */
const ULID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

const hexId = (prefix: string) => new RegExp(`^${prefix}_[0-9a-f]{12}$`);
const ulidId = (prefix: string) =>
  new RegExp(`^${prefix}_[${ULID_ALPHABET}]{26}$`);

interface BrandedId<B extends string> {
  readonly schema: z.ZodType<Brand<string, B>, string>;
  readonly pattern: RegExp;
  parse(value: string): Brand<string, B>;
  is(value: string): value is Brand<string, B>;
}

function brandedString<B extends string>(
  brand: B,
  pattern: RegExp,
  hint: string,
): BrandedId<B> {
  const schema = z
    .string()
    .regex(pattern, `expected a ${brand} (${hint})`)
    .transform((s) => s as Brand<string, B>);

  return {
    schema,
    pattern,
    parse: (value: string) => schema.parse(value),
    is: (value: string): value is Brand<string, B> => pattern.test(value),
  };
}

/* ── Family 1: content-hash ids — `<prefix>_` + 12 lowercase hex ───── */

export type EpochId = Brand<string, "EpochId">;
export type ForkId = Brand<string, "ForkId">;
export type DataVersionId = Brand<string, "DataVersionId">;
export type ScenarioHash = Brand<string, "ScenarioHash">;
export type PlanId = Brand<string, "PlanId">;

export const EpochId = brandedString<"EpochId">(
  "EpochId",
  hexId("ep"),
  "ep_ + 12 hex",
);
export const ForkId = brandedString<"ForkId">(
  "ForkId",
  hexId("fk"),
  "fk_ + 12 hex",
);
export const DataVersionId = brandedString<"DataVersionId">(
  "DataVersionId",
  hexId("dv"),
  "dv_ + 12 hex",
);
export const ScenarioHash = brandedString<"ScenarioHash">(
  "ScenarioHash",
  hexId("sc"),
  "sc_ + 12 hex",
);
export const PlanId = brandedString<"PlanId">(
  "PlanId",
  hexId("pl"),
  "pl_ + 12 hex",
);

/* ── Family 2: time-sortable ids — `<prefix>_` + 26-char ULID ──────── */

export type RunId = Brand<string, "RunId">;
export type OutcomeId = Brand<string, "OutcomeId">;
export type IngestId = Brand<string, "IngestId">;
export type AuditId = Brand<string, "AuditId">;

export const RunId = brandedString<"RunId">(
  "RunId",
  ulidId("run"),
  "run_ + ULID",
);
export const OutcomeId = brandedString<"OutcomeId">(
  "OutcomeId",
  ulidId("out"),
  "out_ + ULID",
);
export const IngestId = brandedString<"IngestId">(
  "IngestId",
  ulidId("ing"),
  "ing_ + ULID",
);
export const AuditId = brandedString<"AuditId">(
  "AuditId",
  ulidId("aud"),
  "aud_ + ULID",
);

/* ── Family 3: world-scoped composite ids — `world:seat:kind:local` ── */

export type WorldId = Brand<string, "WorldId">;
export type SeatId = Brand<string, "SeatId">;
export type HouseholdId = Brand<string, "HouseholdId">;
export type PersonId = Brand<string, "PersonId">;
export type CellId = Brand<string, "CellId">;

const WORLD_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
/**
 * ONS GSS constituency codes: a nation letter, a two-digit area type
 * (E14 / W07 / S14 / N05 for 2024 constituencies) and six digits.
 */
const SEAT_PATTERN = /^(?:E14|W07|S14|N05)\d{6}$/;

export const WorldId = brandedString<"WorldId">(
  "WorldId",
  WORLD_PATTERN,
  "lowercase slug, e.g. uk",
);
export const SeatId = brandedString<"SeatId">(
  "SeatId",
  SEAT_PATTERN,
  "ONS GSS code, e.g. E14001156",
);

export type EntityKind = "hh" | "p" | "cell";

export interface CompositeId {
  worldId: WorldId;
  seatId: SeatId;
  kind: EntityKind;
  local: string;
}

const COMPOSITE_PATTERN =
  /^([a-z][a-z0-9-]{1,31}):((?:E14|W07|S14|N05)\d{6}):(hh|p|cell):([0-9a-f]{1,12})$/;

/** Format a composite id: `uk:E14001156:hh:00b3c1`. */
export function formatCompositeId(id: CompositeId): string {
  return `${id.worldId}:${id.seatId}:${id.kind}:${id.local}`;
}

/**
 * Parse a composite id. The id alone locates the row's Durable Object —
 * there is no shard directory table anywhere.
 */
export function parseCompositeId(value: string): CompositeId {
  const match = COMPOSITE_PATTERN.exec(value);
  const worldId = match?.[1];
  const seatId = match?.[2];
  const kind = match?.[3];
  const local = match?.[4];
  if (!worldId || !seatId || !kind || !local) {
    throw new Error(`malformed composite id: ${value}`);
  }
  return {
    worldId: worldId as WorldId,
    seatId: seatId as SeatId,
    kind: kind as EntityKind,
    local,
  };
}

/** The Durable Object name for a composite id's owning shard. */
export function shardNameFor(id: string | CompositeId): string {
  const parsed = typeof id === "string" ? parseCompositeId(id) : id;
  return `${parsed.worldId}:${parsed.seatId}`;
}

function compositeOfKind<B extends string>(brand: B, kind: EntityKind) {
  const test = (value: string) =>
    COMPOSITE_PATTERN.test(value) && parseCompositeId(value).kind === kind;
  const schema = z
    .string()
    .refine(test, `expected a ${brand} (world:seat:${kind}:local)`)
    .transform((s) => s as Brand<string, B>);
  return {
    schema,
    parse: (value: string): Brand<string, B> => schema.parse(value),
    is: (value: string): value is Brand<string, B> => test(value),
  };
}

export const HouseholdId = compositeOfKind<"HouseholdId">("HouseholdId", "hh");
export const PersonId = compositeOfKind<"PersonId">("PersonId", "p");
export const CellId = compositeOfKind<"CellId">("CellId", "cell");

/* ── Family 4: authored documents — `slug@version` ─────────────────── */

export interface AuthoredId {
  slug: string;
  version: number;
}

const AUTHORED_PATTERN = /^([a-z][a-z0-9-]*)@(\d+)$/;

export function formatAuthoredId(id: AuthoredId): string {
  return `${id.slug}@${id.version}`;
}

export function parseAuthoredId(value: string): AuthoredId {
  const match = AUTHORED_PATTERN.exec(value);
  const slug = match?.[1];
  const version = match?.[2];
  if (!slug || version === undefined) {
    throw new Error(`malformed authored id: ${value}`);
  }
  return { slug, version: Number(version) };
}

/**
 * The 12-hex content-hash id for a set of defining inputs — the
 * reproducibility contract of docs/10-data-model.md. The caller keeps the
 * full hash alongside the truncated id in the owning row.
 */
export async function contentHashId(
  prefix: "ep" | "fk" | "dv" | "sc" | "pl",
  inputs: unknown,
): Promise<{ id: string; fullHash: string }> {
  const canonical = canonicalJson(inputs);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fullHash = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { id: `${prefix}_${fullHash.slice(0, 12)}`, fullHash };
}

/** Stable JSON: object keys sorted, so hashing is order-independent. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
  return `{${entries.join(",")}}`;
}

/**
 * A lowercase Crockford base32 ULID: 10 chars of millisecond timestamp
 * followed by 16 of randomness. Creation order becomes lexicographic
 * order, so `ORDER BY run_id DESC` is "latest first" with no timestamp
 * index (docs/10-data-model.md).
 */
export function newUlid(now: number = Date.now()): string {
  let timestamp = "";
  let remaining = now;
  for (let i = 0; i < 10; i++) {
    timestamp = ULID_ALPHABET[remaining % 32] + timestamp;
    remaining = Math.floor(remaining / 32);
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let random = "";
  for (const byte of bytes) {
    random += ULID_ALPHABET[byte % 32];
  }
  return timestamp + random;
}

/** `run_01j9dq…`, `aud_01j9dq…` — a prefixed, time-sortable id. */
export function newPrefixedUlid(
  prefix: "run" | "out" | "ing" | "aud",
  now?: number,
): string {
  return `${prefix}_${newUlid(now)}`;
}
