import { Queue } from "bullmq";
import { getConnectionOptions, isQueueEnabled } from "@/lib/queue/connection";
import {
  FOLLOW_UP_JOB_NAME,
  FOLLOW_UP_MAX_ATTEMPTS,
  FOLLOW_UP_QUEUE_NAME,
  FOLLOW_UP_RETRY_DELAY_MS,
} from "./constants";
import type { FollowUpQueuePayload } from "./types";

let followUpQueue: Queue<FollowUpQueuePayload> | null = null;

export function getFollowUpQueue(): Queue<FollowUpQueuePayload> {
  if (!followUpQueue) {
    followUpQueue = new Queue<FollowUpQueuePayload>(FOLLOW_UP_QUEUE_NAME, {
      connection: getConnectionOptions(),
      defaultJobOptions: {
        attempts: FOLLOW_UP_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: FOLLOW_UP_RETRY_DELAY_MS },
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 10000 },
      },
    });
  }
  return followUpQueue;
}

export async function enqueueFollowUpProcessing(
  payload: FollowUpQueuePayload,
  options?: { delayMs?: number },
): Promise<boolean> {
  if (!isQueueEnabled()) return false;

  const queue = getFollowUpQueue();
  await queue.add(FOLLOW_UP_JOB_NAME, payload, {
    jobId: `follow-up-${payload.scheduleId}`,
    delay: options?.delayMs,
  });

  return true;
}

export async function removeFollowUpQueueJob(
  scheduleId: string,
): Promise<void> {
  if (!isQueueEnabled()) return;
  const queue = getFollowUpQueue();
  const job = await queue.getJob(`follow-up-${scheduleId}`);
  if (job) await job.remove();
}

export async function getFollowUpQueueCounts() {
  if (!isQueueEnabled()) {
    return { waiting: 0, active: 0, delayed: 0 };
  }

  const queue = getFollowUpQueue();
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, delayed };
}

export { FOLLOW_UP_QUEUE_NAME, FOLLOW_UP_JOB_NAME };
