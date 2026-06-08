import { Queue } from "bullmq";
import { getQueueConnectionOptions, isQueueEnabled } from "@/lib/queue/connection";
import { fetchSimpleQueueCounts } from "@/lib/queue/queue-counts";
import { canEnqueueToRedis } from "@/lib/system/system-guard";
import {
  getLastEmailCounts,
  rememberEmailCounts,
} from "@/lib/system/redis-snapshot";
import {
  EMAIL_JOB_NAME,
  EMAIL_MAX_ATTEMPTS,
  EMAIL_QUEUE_NAME,
  EMAIL_RETRY_DELAY_MS,
} from "./constants";
import type { EmailQueuePayload } from "./types";

let emailQueue: Queue<EmailQueuePayload> | null = null;

export function getEmailQueue(): Queue<EmailQueuePayload> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailQueuePayload>(EMAIL_QUEUE_NAME, {
      connection: getQueueConnectionOptions(),
      defaultJobOptions: {
        attempts: EMAIL_MAX_ATTEMPTS,
        backoff: { type: "exponential", delay: EMAIL_RETRY_DELAY_MS },
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 10000 },
      },
    });
  }
  return emailQueue;
}

export async function enqueueEmailDelivery(
  payload: EmailQueuePayload,
  options?: { delayMs?: number },
): Promise<boolean> {
  if (!isQueueEnabled()) return false;
  if (!(await canEnqueueToRedis())) return false;

  const queue = getEmailQueue();
  await queue.add(EMAIL_JOB_NAME, payload, {
    jobId: `email-${payload.emailMessageId}`,
    delay: options?.delayMs,
  });

  return true;
}

export async function removeEmailQueueJob(emailMessageId: string): Promise<void> {
  if (!isQueueEnabled()) return;
  const queue = getEmailQueue();
  const job = await queue.getJob(`email-${emailMessageId}`);
  if (job) await job.remove();
}

export async function getEmailQueueCounts() {
  if (!isQueueEnabled()) {
    return { waiting: 0, active: 0, delayed: 0 };
  }

  try {
    const queue = getEmailQueue();
    const counts = await fetchSimpleQueueCounts(queue, "email-queue-counts");
    rememberEmailCounts(counts);
    return counts;
  } catch (error) {
    console.warn(
      "[email-queue] Redis counts unavailable — using last-known snapshot:",
      error instanceof Error ? error.message : error,
    );
    return getLastEmailCounts();
  }
}

export { EMAIL_QUEUE_NAME, EMAIL_JOB_NAME };
