/**
 * Vault — the asking domain: scenarios, questions, runs and outcomes
 * (docs/06-scenarios.md, docs/07-questions.md). No public routes.
 */
import { SeldonError } from "@seldon/foundation";

export { VaultEntrypoint } from "./entrypoint.js";

export default {
  fetch(): Response {
    const error = new SeldonError(
      "not_found",
      "vault has no public routes; call it over a service binding",
    );
    return Response.json(error.toWire(), { status: error.httpStatus });
  },
};
