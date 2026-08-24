import { readFileSync } from "node:fs";
import { environment } from "./config.js";

/**
 * Hostnames come from `config/environments.json`, the same file the
 * generated `wrangler.jsonc` route blocks read, so a route and its Access
 * application can never point at different names.
 *
 * The records themselves are created by Wrangler when it attaches each
 * public Worker's custom domain, so there are no DNS resources here —
 * only the names both layers agree on.
 */
interface EnvironmentsFile {
  environments: Record<
    string,
    { zone: string; consoleHostname: string; apiHostname: string }
  >;
}

const file = JSON.parse(
  readFileSync(
    new URL("../../config/environments.json", import.meta.url),
    "utf8",
  ),
) as EnvironmentsFile;

const entry = file.environments[environment];
if (!entry) {
  throw new Error(`config/environments.json has no ${environment} entry`);
}

export const hostnames = {
  zone: entry.zone,
  console: entry.consoleHostname,
  api: entry.apiHostname,
};
