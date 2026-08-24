import { describe, expect, it } from "vitest";
import { verifyAccessJwt } from "../src/access.js";
import { parseRoleMap, requireRole } from "../src/identity.js";

const TEAM = "seldon.cloudflareaccess.com";
const AUD = "seldon-api-staging";

function b64url(input: string | Uint8Array): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function issue(
  claims: Record<string, unknown>,
): Promise<{ token: string; jwks: { keys: unknown[] } }> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const kid = "test-key";
  const header = b64url(JSON.stringify({ alg: "RS256", kid }));
  const payload = b64url(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    pair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return {
    token: `${header}.${payload}.${b64url(new Uint8Array(signature))}`,
    jwks: { keys: [{ ...jwk, kid, alg: "RS256" }] },
  };
}

const claims = (overrides: Record<string, unknown> = {}) => ({
  sub: "abc",
  email: "me@alancole.io",
  aud: [AUD],
  iss: `https://${TEAM}`,
  iat: 1_700_000_000,
  exp: 4_000_000_000,
  ...overrides,
});

async function verify(
  token: string,
  jwks: unknown,
  overrides: Partial<{ aud: string; teamDomain: string }> = {},
) {
  return verifyAccessJwt(token, {
    teamDomain: overrides.teamDomain ?? TEAM,
    aud: overrides.aud ?? AUD,
    fetcher: async () =>
      new Response(JSON.stringify(jwks), {
        headers: { "content-type": "application/json" },
      }),
  });
}

describe("Access JWT validation", () => {
  it("accepts a token signed by the team's published key", async () => {
    const { token, jwks } = await issue(claims());
    await expect(verify(token, jwks)).resolves.toMatchObject({
      email: "me@alancole.io",
    });
  });

  it("rejects a tampered payload", async () => {
    const { token, jwks } = await issue(claims());
    const [header, , signature] = token.split(".");
    const forged = `${header}.${b64url(
      JSON.stringify(claims({ email: "someone@else.test" })),
    )}.${signature}`;
    await expect(verify(forged, jwks)).rejects.toThrow(/signature invalid/);
  });

  it("rejects the wrong audience, issuer and an expired token", async () => {
    const { token, jwks } = await issue(claims());
    await expect(verify(token, jwks, { aud: "other" })).rejects.toThrow(
      /audience mismatch/,
    );
    await expect(
      verify(token, jwks, { teamDomain: "elsewhere.cloudflareaccess.com" }),
    ).rejects.toThrow(/issuer mismatch|unknown Access key/);

    const expired = await issue(claims({ exp: 1_700_000_100 }));
    await expect(verify(expired.token, expired.jwks)).rejects.toThrow(
      /expired/,
    );
  });

  it("rejects a token whose key is not in the set", async () => {
    const { token } = await issue(claims());
    await expect(verify(token, { keys: [] })).rejects.toThrow(
      /unknown Access key id/,
    );
  });

  it("rejects an unsigned token outright", async () => {
    const header = b64url(JSON.stringify({ alg: "none", kid: "test-key" }));
    const payload = b64url(JSON.stringify(claims()));
    // An empty signature segment is malformed; a present one still has to
    // be RS256, so `alg: none` never reaches the key set either.
    await expect(verify(`${header}.${payload}.`, { keys: [] })).rejects.toThrow(
      /malformed Access token/,
    );
    await expect(
      verify(`${header}.${payload}.${b64url("nonsense")}`, { keys: [] }),
    ).rejects.toThrow(/unsupported Access token algorithm none/);
  });
});

describe("roles", () => {
  it("reads the owner-managed map", () => {
    const map = parseRoleMap('{"Me@Alancole.io":"owner","bot":"viewer"}');
    expect(map["me@alancole.io"]).toBe("owner");
    expect(map.bot).toBe("viewer");
  });

  it("refuses an unknown role rather than guessing", () => {
    expect(() => parseRoleMap('{"a":"admin"}')).toThrow(/unknown role/);
    expect(() => parseRoleMap("not json")).toThrow(/not valid JSON/);
  });

  it("enforces the role ladder", () => {
    const viewer = {
      actor: "v",
      role: "viewer" as const,
      origin: "console" as const,
    };
    expect(() => requireRole(viewer, "viewer")).not.toThrow();
    expect(() => requireRole(viewer, "operator")).toThrow(/operator role/);
    expect(() =>
      requireRole({ ...viewer, role: "owner" }, "operator"),
    ).not.toThrow();
  });
});
