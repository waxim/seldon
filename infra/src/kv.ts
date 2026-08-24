import * as cloudflare from "@pulumi/cloudflare";
import { inventory } from "@seldon/foundation";
import { accountId, environment } from "./config.js";

/** Caches only: everything in KV is reconstructible. */
export const kvNamespaces = new Map(
  inventory(environment).kvNamespaces.map((title) => [
    title,
    new cloudflare.WorkersKvNamespace(title, { accountId, title }),
  ]),
);
