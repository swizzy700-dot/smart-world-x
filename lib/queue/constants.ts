export const PIPELINE_QUEUE_NAME = "website-pipeline";
export const PROCESS_JOB_NAME = "process-website";

export const QUEUE_WORKER_CONCURRENCY = Number(
  process.env.QUEUE_WORKER_CONCURRENCY ?? 5,
);

export const QUEUE_MAX_ATTEMPTS = Number(process.env.QUEUE_MAX_ATTEMPTS ?? 3);

export const QUEUE_LOCK_TTL_MS = Number(
  process.env.QUEUE_LOCK_TTL_MS ?? 5 * 60 * 1000,
);

export const QUEUE_POLL_INTERVAL_MS = Number(
  process.env.QUEUE_POLL_INTERVAL_MS ?? 2000,
);

export const QUEUE_DB_BATCH_SIZE = Number(
  process.env.QUEUE_DB_BATCH_SIZE ?? 10,
);

export const QUEUE_RATE_LIMIT_MAX = Number(
  process.env.QUEUE_RATE_LIMIT_MAX ?? 50,
);

export const QUEUE_RATE_LIMIT_DURATION_MS = Number(
  process.env.QUEUE_RATE_LIMIT_DURATION_MS ?? 1000,
);

/** Stages recorded by the queue processor (pipeline hooks attach later). */
export const QUEUE_STAGES = [
  "acquire",
  "validate",
  "analyze",
  "extract_contacts",
  "generate_outreach",
  "complete",
] as const;

export type QueueStage = (typeof QUEUE_STAGES)[number];
