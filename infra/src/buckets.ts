import * as cloudflare from "@pulumi/cloudflare";
import { inventory } from "@seldon/foundation";
import { accountId, environment } from "./config.js";

/**
 * The four buckets, split by lifecycle rather than by service:
 * datasets, epochs, tiles, runs (docs/10-data-model.md).
 */
export const buckets = new Map(
  inventory(environment).r2Buckets.map((bucketName) => [
    bucketName,
    new cloudflare.R2Bucket(bucketName, {
      accountId,
      name: bucketName,
      // Keep the population near its readers; adjust per-bucket if the
      // account's traffic ever says otherwise.
      location: "weur",
    }),
  ]),
);
