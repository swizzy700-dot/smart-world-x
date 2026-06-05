import { startEmailDbPoller, stopEmailDbPoller } from "./db-poller";


import { Worker, type Job } from "bullmq";

import { getConnectionOptions } from "@/lib/queue/connection";
import {
  EMAIL_MAX_ATTEMPTS,
  EMAIL_QUEUE_NAME,
  EMAIL_WORKER_CONCURRENCY,
} from "./constants";
import { executeEmailSend } from "./send-email";
import type { EmailQueuePayload } from "./types";

let worker: Worker<EmailQueuePayload> | null = null;

async function handleJob(job: Job<EmailQueuePayload>) {
  const { emailMessageId } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? EMAIL_MAX_ATTEMPTS;

  try {
    await executeEmailSend(emailMessageId, { attemptNumber });
  } catch (error) {
    if (attemptNumber >= maxAttempts) {
      return;
    }
    throw error;
  }
}

export function startEmailRedisWorker(): Worker<EmailQueuePayload> {
  if (worker) return worker;

  worker = new Worker<EmailQueuePayload>(EMAIL_QUEUE_NAME, handleJob, {
    connection: getConnectionOptions(),
    concurrency: EMAIL_WORKER_CONCURRENCY,
  });

  worker.on("failed", (job, err) => {
    console.error(`[email-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[email-worker] Job ${job.id} completed`);
  });

  console.log(
    `[email-worker] Redis worker started (concurrency=${EMAIL_WORKER_CONCURRENCY})`,
  );

  return worker;
}

export async function stopEmailRedisWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}

// Auto-start when run directly
startEmailRedisWorker();
startEmailDbPoller();

process.on("SIGINT", async () => {
  console.log("[email-worker] Shutting down...");
  stopEmailDbPoller();
  await stopEmailRedisWorker();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[email-worker] Shutting down...");
  stopEmailDbPoller();
  await stopEmailRedisWorker();
  process.exit(0);
});
