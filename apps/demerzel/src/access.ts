/**
 * Cloudflare Access JWT validation.
 *
 * The edge has already checked the token, and Demerzel checks it again —
 * signature against the team's published keys, audience and issuer — so
 * the gateway never trusts the network path alone (docs/11-api.md).
 */
import { SeldonError } from "@seldon/foundation";

export interface AccessPayload {
  /** Access subject id. */
  sub: string;
  /** Email for a human identity; absent for a service token. */
  email?: string;
  /** Common name for a service token identity. */
  common_name?: string;
  aud: string[] | string;
  iss: string;
  exp: number;
  iat: number;
}

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
}

const JWKS_TTL_SECONDS = 3600;

export interface VerifyOptions {
  teamDomain: string;
  aud: string;
  /** KV cache for the team's public keys. */
  kv?: KVNamespace;
  fetcher?: typeof globalThis.fetch;
  now?: () => number;
}

export async function verifyAccessJwt(
  token: string,
  options: VerifyOptions,
): Promise<AccessPayload> {
  const parts = token.split(".");
  const [headerPart, payloadPart, signaturePart] = parts;
  if (parts.length !== 3 || !headerPart || !payloadPart || !signaturePart) {
    throw new SeldonError("unauthenticated", "malformed Access token");
  }

  const header = decodeJson<{ kid?: string; alg?: string }>(headerPart);
  if (header.alg !== "RS256") {
    throw new SeldonError(
      "unauthenticated",
      `unsupported Access token algorithm ${header.alg}`,
    );
  }
  if (!header.kid) {
    throw new SeldonError("unauthenticated", "Access token has no key id");
  }

  const key = await publicKeyFor(header.kid, options);
  const valid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!valid) {
    throw new SeldonError("unauthenticated", "Access token signature invalid");
  }

  const payload = decodeJson<AccessPayload>(payloadPart);
  const now = Math.floor((options.now?.() ?? Date.now()) / 1000);
  if (payload.exp <= now) {
    throw new SeldonError("unauthenticated", "Access token expired");
  }
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(options.aud)) {
    throw new SeldonError("unauthenticated", "Access token audience mismatch");
  }
  const expectedIssuer = `https://${options.teamDomain}`;
  if (payload.iss !== expectedIssuer) {
    throw new SeldonError("unauthenticated", "Access token issuer mismatch");
  }
  return payload;
}

async function publicKeyFor(
  kid: string,
  options: VerifyOptions,
): Promise<CryptoKey> {
  const keys = await jwks(options);
  const jwk = keys.find((candidate) => candidate.kid === kid);
  if (!jwk) {
    throw new SeldonError("unauthenticated", `unknown Access key id ${kid}`);
  }
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function jwks(options: VerifyOptions): Promise<Jwk[]> {
  const cacheKey = `access:jwks:${options.teamDomain}`;
  const cached = await options.kv?.get<Jwk[]>(cacheKey, "json");
  if (cached) return cached;

  const doFetch = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const response = await doFetch(
    `https://${options.teamDomain}/cdn-cgi/access/certs`,
  );
  if (!response.ok) {
    throw new SeldonError("unavailable", "cannot reach the Access key set");
  }
  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  await options.kv?.put(cacheKey, JSON.stringify(keys), {
    expirationTtl: JWKS_TTL_SECONDS,
  });
  return keys;
}

function decodeJson<T>(part: string): T {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as T;
  } catch (cause) {
    throw new SeldonError("unauthenticated", "malformed Access token", {
      cause,
    });
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
