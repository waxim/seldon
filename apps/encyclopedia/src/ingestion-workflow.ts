import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { EncyclopediaEnv } from "./env.js";

export interface IngestionParams {
  worldId: string;
  sourceId: string;
}

/**
 * IngestionWorkflow — fetch → verify → stage → load → derive
 * (docs/05-datasets.md). P0 walks the five steps so retries and
 * resumability are proven; the bodies land in P1, where a failed
 * checksum must fail loudly rather than continue.
 */
export class IngestionWorkflow extends WorkflowEntrypoint<
  EncyclopediaEnv,
  IngestionParams
> {
  override async run(
    event: Readonly<WorkflowEvent<IngestionParams>>,
    step: WorkflowStep,
  ): Promise<{ sourceId: string; steps: string[] }> {
    const { sourceId } = event.payload;
    const steps: string[] = [];
    for (const name of ["fetch", "verify", "stage", "load", "derive"]) {
      steps.push(await step.do(name, async () => name));
    }
    return { sourceId, steps };
  }
}
