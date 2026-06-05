import { Queue } from "bullmq";
import {
  PIPELINE_QUEUE_NAME,
  PROCESS_JOB_NAME,
} from "./constants";
import { getConnectionOptions, isQueueEnabled } from "./connection";
import type { PipelineJobPayload } from "./types";

let pipelineQueue: Queue<PipelineJobPayload> | null = null;

export function getPipelineQueue(): Queue<PipelineJobPayload> {
  if (!pipelineQueue) {
    pipelineQueue = new Queue<PipelineJobPayload>(PIPELINE_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 10000 },
      },
    });
  }
  return pipelineQueue;
}

export async function enqueuePipelineJob(
  payload: PipelineJobPayload,
  options?: { priority?: number; delayMs?: number },
): Promise<boolean> {
  if (!isQueueEnabled()) return false;

  const queue = getPipelineQueue();
  await queue.add(PROCESS_JOB_NAME, payload, {
    jobId: payload.jobId,
    priority: options?.priority ?? 0,
    delay: options?.delayMs,
    removeOnComplete: true,
    removeOnFail: false,
  });

  return true;
}

export async function enqueuePipelineJobs(
  jobs: PipelineJobPayload[],
  options?: { priority?: number },
): Promise<number> {
  if (!isQueueEnabled() || jobs.length === 0) return 0;

  const queue = getPipelineQueue();
  const chunkSize = 100;
  let enqueued = 0;

  for (let i = 0; i < jobs.length; i += chunkSize) {
    const chunk = jobs.slice(i, i + chunkSize);
    await queue.addBulk(
      chunk.map((job) => ({
        name: PROCESS_JOB_NAME,
        data: job,
        opts: {
          jobId: job.jobId,
          priority: options?.priority ?? 0,
        },
      })),
    );
    enqueued += chunk.length;
  }

  return enqueued;
}

export async function removeQueueJob(jobId: string): Promise<void> {
  if (!isQueueEnabled()) return;
  const queue = getPipelineQueue();
  const job = await queue.getJob(jobId);
  if (job) await job.remove();
}

export async function getRedisQueueCounts() {
  if (!isQueueEnabled()) {
    return { waiting: 0, active: 0, delayed: 0, failed: 0, paused: false };
  }

  const queue = getPipelineQueue();
  const [waiting, active, delayed, failed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
    queue.getFailedCount(),
    queue.isPaused(),
  ]);

  return { waiting, active, delayed, failed, paused };
}

export { isQueueEnabled, PIPELINE_QUEUE_NAME, PROCESS_JOB_NAME };
