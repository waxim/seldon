import { resourceName } from "@seldon/foundation";
import { environment } from "./config.js";

/**
 * The one naming rule, in code — imported from `@seldon/foundation` so
 * Pulumi and every wrangler.jsonc derive names from the same table.
 */
export const name = (base: string): string => resourceName(base, environment);
