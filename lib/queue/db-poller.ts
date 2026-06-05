import { ProcessingJobStatus, WebsiteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  QUEUE_DB_BATCH_SIZE,
  QUEUE_LOCK_TTL_MS,
  QUEUE_POLL_INTERVAL_MS,
  QUEUE_WORKER_CONCURRENCY,
} from "./constants";
import { processPipelineJob } from "./processor";
import { markJobFailed } from "./status-sync";
import type { PipelineJobPayload } from "./types";
import { randomUUID } from "crypto";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let running = 0;
const workerId = `db-worker-${randomUUID().slice(0, 8)}`;

async function releaseStaleLocks(): Promise<number> {
  const cutoff = new Date(Date.now() - QUEUE_LOCK_TTL_MS);
  const result = await prisma.processingJob.updateMany({
    where: {
      status: ProcessingJobStatus.ACTIVE,
      lockedAt: { lt: cutoff },
    },
    data: {
      status: ProcessingJobStatus.PENDING,
      lockedAt: null,
      lockToken: null,
      currentStage: "stale_lock_released",
    },
  });

  if (result.count > 0) {
    await prisma.website.updateMany({
      where: { status: WebsiteStatus.PROCESSING },
      data: { status: WebsiteStatus.QUEUED },
    });
  }

  return result.count;
}

async function claimJobs(): Promise<PipelineJobPayload[]> {
  const availableSlots = QUEUE_WORKER_CONCURRENCY - running;
  if (availableSlots <= 0) return [];

  const batchSize = Math.min(QUEUE_DB_BATCH_SIZE, availableSlots);
  const lockToken = randomUUID();
  const now = new Date();

  const candidates = await prisma.processingJob.findMany({
    where: {
      status: ProcessingJobStatus.PENDING,
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      website: {
        status: { in: [WebsiteStatus.QUEUED, WebsiteStatus.NEW] },
      },
      AND: [
        { OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - QUEUE_LOCK_TTL_MS) } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: batchSize,
    include: {
      website: {
        select: { normalizedUrl: true, domain: true, status: true },
      },
    },
  });

  const claimed: PipelineJobPayload[] = [];

  for (const job of candidates) {
    const updated = await prisma.processingJob.updateMany({
      where: {
        id: job.id,
        status: ProcessingJobStatus.PENDING,
        OR: [{ lockToken: null }, { lockedAt: { lt: new Date(Date.now() - QUEUE_LOCK_TTL_MS) } }],
      },
      data: {
        lockToken,
        lockedAt: now,
      },
    });

    if (updated.count === 1) {
      if (job.website.status === WebsiteStatus.NEW) {
        await prisma.website.update({
          where: { id: job.websiteId },
          data: { status: WebsiteStatus.QUEUED },
        });
      }

      claimed.push({
        jobId: job.id,
        websiteId: job.websiteId,
        normalizedUrl: job.website.normalizedUrl,
        domain: job.website.domain,
      });
    }
  }

  return claimed;
}

async function runJob(payload: PipelineJobPayload): Promise<void> {
  running += 1;
  try {
    await processPipelineJob(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";
    await markJobFailed(payload.jobId, message);
  } finally {
    running -= 1;
  }
}

async function pollOnce(): Promise<void> {
  await releaseStaleLocks();
  const jobs = await claimJobs();

  await Promise.all(jobs.map((payload) => runJob(payload)));
}

export function startDbPoller(): void {
  if (pollTimer) return;

  console.log(
    `[worker] DB poller started (id=${workerId}, concurrency=${QUEUE_WORKER_CONCURRENCY}, interval=${QUEUE_POLL_INTERVAL_MS}ms)`,
  );

  pollTimer = setInterval(() => {
    pollOnce().catch((err) => {
      console.error("[worker] DB poll error:", err);
    });
  }, QUEUE_POLL_INTERVAL_MS);

  pollOnce().catch(console.error);
}

export function stopDbPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
