import * as cloudflare from "@pulumi/cloudflare";
import { inventory } from "@seldon/foundation";
import { accountId, environment } from "./config.js";

/**
 * Queues and their dead-letter queues. A DLQ exists for every queue — a
 * retry storm has somewhere to stop (docs/03-architecture.md).
 */
export const queues = new Map(
  inventory(environment).queues.map((queueName) => [
    queueName,
    new cloudflare.Queue(queueName, { accountId, queueName }),
  ]),
);
