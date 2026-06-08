import type { WorkerOptions } from "bullmq";
import {
  BULLMQ_DRAIN_DELAY_SEC,
  BULLMQ_EMAIL_LOCK_DURATION_MS,
  BULLMQ_PIPELINE_LOCK_DURATION_MS,
  BULLMQ_STALLED_INTERVAL_MS,
  QUEUE_LOCK_TTL_MS,
  QUEUE_RATE_LIMIT_DURATION_MS,
  QUEUE_RATE_LIMIT_MAX,
} from "./constants";
import { getQueueConnectionOptions, getWorkerConnectionOptions } from "./connection";

/** Shared idle / stall tuning — reduces Redis traffic when queues are empty. */
function baseWorkerSettings(lockDurationMs: number) {
  return {
    connection: getWorkerConnectionOptions(),
    drainDelay: BULLMQ_DRAIN_DELAY_SEC,
    stalledInterval: BULLMQ_STALLED_INTERVAL_MS,
    lockDuration: lockDurationMs,
    lockRenewTime: Math.floor(lockDurationMs / 2),
    skipWaitingForReady: true,
  } satisfies Partial<WorkerOptions>;
}

export function getPipelineWorkerOptions(
  concurrency: number,
): Omit<WorkerOptions, "connection"> & { connection: WorkerOptions["connection"] } {
  return {
    ...baseWorkerSettings(BULLMQ_PIPELINE_LOCK_DURATION_MS),
    concurrency,
    limiter: {
      max: QUEUE_RATE_LIMIT_MAX,
      duration: QUEUE_RATE_LIMIT_DURATION_MS,
    },
  };
}

export function getEmailWorkerOptions(
  concurrency: number,
): Omit<WorkerOptions, "connection"> & { connection: WorkerOptions["connection"] } {
  return {
    ...baseWorkerSettings(BULLMQ_EMAIL_LOCK_DURATION_MS),
    concurrency,
  };
}

export function getFollowUpWorkerOptions(
  concurrency: number,
): Omit<WorkerOptions, "connection"> & { connection: WorkerOptions["connection"] } {
  return {
    ...baseWorkerSettings(QUEUE_LOCK_TTL_MS),
    concurrency,
  };
}
