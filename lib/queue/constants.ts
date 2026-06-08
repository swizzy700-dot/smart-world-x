export const PIPELINE_QUEUE_NAME = "website-pipeline";
export const PROCESS_JOB_NAME = "process-website";

export const QUEUE_WORKER_CONCURRENCY = Number(
  process.env.QUEUE_WORKER_CONCURRENCY ?? 2,
);

export const QUEUE_MAX_ATTEMPTS = Number(process.env.QUEUE_MAX_ATTEMPTS ?? 3);

export const QUEUE_LOCK_TTL_MS = Number(
  process.env.QUEUE_LOCK_TTL_MS ?? 5 * 60 * 1000,
);

/** BullMQ: seconds to block-wait for jobs when the queue is empty (default 5). */
export const BULLMQ_DRAIN_DELAY_SEC = Number(
  process.env.BULLMQ_DRAIN_DELAY_SEC ?? 30,
);

/** BullMQ: milliseconds between stalled-job checks (default 30000). */
export const BULLMQ_STALLED_INTERVAL_MS = Number(
  process.env.BULLMQ_STALLED_INTERVAL_MS ?? 120_000,
);

/** BullMQ lock duration for long-running pipeline jobs (aligns with DB lock TTL). */
export const BULLMQ_PIPELINE_LOCK_DURATION_MS = Number(
  process.env.BULLMQ_PIPELINE_LOCK_DURATION_MS ?? QUEUE_LOCK_TTL_MS,
);

/** BullMQ lock duration for email delivery jobs. */
export const BULLMQ_EMAIL_LOCK_DURATION_MS = Number(
  process.env.BULLMQ_EMAIL_LOCK_DURATION_MS ?? 60_000,
);

/** In-process cache TTL for Redis queue count API reads. */
export const QUEUE_REDIS_STATS_CACHE_TTL_MS = Number(
  process.env.QUEUE_REDIS_STATS_CACHE_TTL_MS ?? 10_000,
);

export const QUEUE_POLL_INTERVAL_MS = Number(
  process.env.QUEUE_POLL_INTERVAL_MS ?? 2000,
);

export const QUEUE_DB_BATCH_SIZE = Number(
  process.env.QUEUE_DB_BATCH_SIZE ?? 2,
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
