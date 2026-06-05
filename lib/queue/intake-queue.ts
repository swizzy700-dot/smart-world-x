/**
 * @deprecated Import from `@/lib/queue/producer` instead.
 * Kept for backward compatibility with the intake module.
 */
export {
  enqueuePipelineJobs,
  enqueuePipelineJob,
  isQueueEnabled,
  PIPELINE_QUEUE_NAME,
} from "./producer";

export type { PipelineJobPayload } from "./types";
