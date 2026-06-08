import { ProcessingJobStatus, WebsiteStatus } from "@prisma/client";
import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db";
import {
  PIPELINE_QUEUE_NAME,
  PROCESS_JOB_NAME,
  QUEUE_WORKER_CONCURRENCY,
} from "./constants";
import { deferJobIfPaused } from "@/lib/system/system-guard";
import {
  registerWorkerForModeSync,
  startWorkerModeSync,
  stopWorkerModeSync,
  syncWorkersToSystemMode,
  unregisterWorkerForModeSync,
} from "@/lib/system/worker-mode-sync";
import { getPipelineWorkerOptions } from "./bullmq-settings";
import { processPipelineJob } from "./processor";
import { markJobFailed } from "./status-sync";
import type { PipelineJobPayload } from "./types";

let worker: Worker<PipelineJobPayload> | null = null;

async function handleJob(job: Job<PipelineJobPayload>) {
  if (await deferJobIfPaused(job)) {
    return;
  }

  const payload = job.data;
  const maxAttempts = job.opts.attempts ?? 3;
  const attemptNumber = job.attemptsMade + 1;

  try {
    await processPipelineJob(payload, {
      attempts: attemptNumber,
      incrementAttempts: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";

    const isLastAttempt = attemptNumber >= maxAttempts;

    if (isLastAttempt) {
      await markJobFailed(payload.jobId, message, { terminal: true });
      return;
    }

    await prisma.processingJob.update({
      where: { id: payload.jobId },
      data: {
        status: ProcessingJobStatus.PENDING,
        currentStage: "retry",
        lastError: message.slice(0, 2000),
        lockedAt: null,
        lockToken: null,
      },
    });
    await prisma.website.update({
      where: { id: payload.websiteId },
      data: { status: WebsiteStatus.QUEUED },
    });

    throw error;
  }
}

export function startRedisWorker(): Worker<PipelineJobPayload> {
  if (worker) return worker;

  worker = new Worker<PipelineJobPayload>(
    PIPELINE_QUEUE_NAME,
    handleJob,
    getPipelineWorkerOptions(QUEUE_WORKER_CONCURRENCY),
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[worker] Job ${job?.id ?? "unknown"} failed:`,
      err.message,
    );
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  registerWorkerForModeSync(worker);
  startWorkerModeSync();
  syncWorkersToSystemMode().catch((err) => {
    console.warn("[worker] system mode sync failed:", err);
  });

  console.log(
    `[worker] Redis worker started (concurrency=${QUEUE_WORKER_CONCURRENCY})`,
  );

  return worker;
}

export async function stopRedisWorker(): Promise<void> {
  if (worker) {
    unregisterWorkerForModeSync(worker);
    await worker.close();
    worker = null;
  }
}

export { PROCESS_JOB_NAME };

// Auto-start when run directly
if (require.main === module) {
  startRedisWorker();
}

process.on("SIGINT", async () => {
  console.log("[worker] Shutting down...");
  await stopRedisWorker();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await stopRedisWorker();
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[worker] Unhandled rejection:", reason, "at:", promise);
});

process.on("uncaughtException", (error) => {
  console.error("[worker] Uncaught exception:", error);
  process.exit(1);
});
