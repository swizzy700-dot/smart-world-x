import { Worker, type Job } from "bullmq";
import { getEmailWorkerOptions } from "@/lib/queue/bullmq-settings";
import { isQueueEnabled } from "@/lib/queue/connection";
import { deferJobIfPaused } from "@/lib/system/system-guard";
import {
  registerWorkerForModeSync,
  startWorkerModeSync,
  stopWorkerModeSync,
  syncWorkersToSystemMode,
  unregisterWorkerForModeSync,
} from "@/lib/system/worker-mode-sync";
import {
  EMAIL_MAX_ATTEMPTS,
  EMAIL_QUEUE_NAME,
  EMAIL_WORKER_CONCURRENCY,
} from "./constants";
import { startEmailDbPoller, stopEmailDbPoller } from "./db-poller";
import { executeEmailSend } from "./send-email";
import type { EmailQueuePayload } from "./types";

let worker: Worker<EmailQueuePayload> | null = null;

async function handleJob(job: Job<EmailQueuePayload>) {
  if (await deferJobIfPaused(job)) {
    return;
  }

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

  worker = new Worker<EmailQueuePayload>(
    EMAIL_QUEUE_NAME,
    handleJob,
    getEmailWorkerOptions(EMAIL_WORKER_CONCURRENCY),
  );

  worker.on("failed", (job, err) => {
    console.error(`[email-worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[email-worker] Job ${job.id} completed`);
  });

  registerWorkerForModeSync(worker);
  startWorkerModeSync();
  syncWorkersToSystemMode().catch((err) => {
    console.warn("[email-worker] system mode sync failed:", err);
  });

  console.log(
    `[email-worker] Redis worker started (concurrency=${EMAIL_WORKER_CONCURRENCY})`,
  );

  return worker;
}

export async function stopEmailRedisWorker(): Promise<void> {
  if (worker) {
    unregisterWorkerForModeSync(worker);
    await worker.close();
    worker = null;
  }
}

// Auto-start only when this file is the entrypoint (not when imported by workers/email-worker.ts)
if (require.main === module) {
  if (isQueueEnabled()) {
    startEmailRedisWorker();
  } else {
    startEmailDbPoller();
  }
}

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
