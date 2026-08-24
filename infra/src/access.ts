import * as cloudflare from "@pulumi/cloudflare";
import { accessEmails, accountId, environment } from "./config.js";
import { hostnames } from "./dns.js";

/**
 * Cloudflare Access fronts both public surfaces — the console and the
 * API — and nothing else has a public route to defend
 * (docs/03-architecture.md).
 *
 * The CI service token is issued here too: the smoke walk authenticates
 * with it exactly as a human session would.
 */
const applications = {
  console: new cloudflare.ZeroTrustAccessApplication(
    `seldon-console-${environment}`,
    {
      accountId,
      name: `Seldon console (${environment})`,
      domain: hostnames.console,
      type: "self_hosted",
      sessionDuration: "24h",
      httpOnlyCookieAttribute: true,
      autoRedirectToIdentity: true,
    },
  ),
  api: new cloudflare.ZeroTrustAccessApplication(`seldon-api-${environment}`, {
    accountId,
    name: `Seldon API (${environment})`,
    domain: hostnames.api,
    type: "self_hosted",
    sessionDuration: "24h",
    httpOnlyCookieAttribute: true,
  }),
};

/** The small-team policy: named identities, plus the CI service token. */
const teamPolicy = new cloudflare.ZeroTrustAccessPolicy(
  `seldon-team-${environment}`,
  {
    accountId,
    name: `Seldon team (${environment})`,
    decision: "allow",
    // One include per identity: the small-team policy, written out.
    includes: accessEmails.map((email) => ({ email: { email } })),
  },
);

export const ciServiceToken = new cloudflare.ZeroTrustAccessServiceToken(
  `seldon-ci-${environment}`,
  {
    accountId,
    name: `Seldon CI (${environment})`,
    duration: "8760h",
  },
);

const servicePolicy = new cloudflare.ZeroTrustAccessPolicy(
  `seldon-ci-policy-${environment}`,
  {
    accountId,
    name: `Seldon CI (${environment})`,
    decision: "non_identity",
    includes: [{ serviceToken: { tokenId: ciServiceToken.id } }],
  },
);

export const access = { applications, teamPolicy, servicePolicy };
