import { Queue } from "bullmq";
import { getConnectionOptions, isQueueEnabled } from "@/lib/queue/connection";
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
      connection: getConnectionOptions(),
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

  const queue = getEmailQueue();
  const [waiting, active, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, delayed };
}

export { EMAIL_QUEUE_NAME, EMAIL_JOB_NAME };
