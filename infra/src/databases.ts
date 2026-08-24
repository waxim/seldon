import * as cloudflare from "@pulumi/cloudflare";
import { inventory } from "@seldon/foundation";
import { accountId, environment } from "./config.js";

/** One D1 database per owning service (docs/10-data-model.md). */
export const databases = new Map(
  inventory(environment).d1Databases.map((databaseName) => [
    databaseName,
    new cloudflare.D1Database(databaseName, {
      accountId,
      name: databaseName,
    }),
  ]),
);
