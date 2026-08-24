import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import type { RadiantEnv } from "./env.js";

export interface SynthesisParams {
  worldId: string;
  dataVersion: string;
  seed: number;
}

/**
 * SynthesisWorkflow — derive marginals → per-seat IPF fan-out → validate
 * → publish (docs/04-population.md). P0 walks the step skeleton so the
 * binding, retries and resumability are proven; each step gets its real
 * body in P2.
 */
export class SynthesisWorkflow extends WorkflowEntrypoint<
  RadiantEnv,
  SynthesisParams
> {
  override async run(
    event: Readonly<WorkflowEvent<SynthesisParams>>,
    step: WorkflowStep,
  ): Promise<{ worldId: string; steps: string[] }> {
    const { worldId } = event.payload;

    const planned = await step.do("derive-marginals", async () => [
      "derive-marginals",
    ]);
    const fanned = await step.do("per-seat-ipf", async () => [
      ...planned,
      "per-seat-ipf",
    ]);
    const validated = await step.do("validate-fidelity", async () => [
      ...fanned,
      "validate-fidelity",
    ]);
    const published = await step.do("publish-epoch", async () => [
      ...validated,
      "publish-epoch",
    ]);

    return { worldId, steps: published };
  }
}
