/**
 * Encyclopedia — datasets: manifests, ingestion, the catalogue and data
 * versions (docs/05-datasets.md). No public routes.
 */
import { SeldonError } from "@seldon/foundation";

export { EncyclopediaEntrypoint } from "./entrypoint.js";
export { IngestionWorkflow } from "./ingestion-workflow.js";

export default {
  fetch(): Response {
    const error = new SeldonError(
      "not_found",
      "encyclopedia has no public routes; call it over a service binding",
    );
    return Response.json(error.toWire(), { status: error.httpStatus });
  },
};
