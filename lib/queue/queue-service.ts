import {
  ProcessingJobStatus,
  WebsiteStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  enqueuePipelineJob,
  getRedisQueueCounts,
  isQueueEnabled,
  removeQueueJob,
} from "./producer";
import { resetJobForRetry, markJobFailed } from "./status-sync";
import type {
  JobListItem,
  JobListResult,
  PipelineJobPayload,
  QueueStats,
  ReconcileResult,
  RetryJobResult,
} from "./types";
import { QUEUE_WORKER_CONCURRENCY } from "./constants";

export class QueueError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "QueueError";
  }
}

function buildPayload(job: {
  id: string;
  websiteId: string;
  website: { normalizedUrl: string; domain: string };
}): PipelineJobPayload {
  return {
    jobId: job.id,
    websiteId: job.websiteId,
    normalizedUrl: job.website.normalizedUrl,
    domain: job.website.domain,
  };
}

export async function getQueueStats(): Promise<QueueStats> {
  const [websiteGroups, jobGroups, activeLocks, redisCounts] =
    await Promise.all([
      prisma.website.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.processingJob.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.processingJob.count({
        where: {
          status: ProcessingJobStatus.ACTIVE,
          lockedAt: { not: null },
        },
      }),
      getRedisQueueCounts(),
    ]);

  const websites = emptyWebsiteCounts();
  for (const row of websiteGroups) {
    websites[row.status] = row._count._all;
  }

  const jobs = emptyJobCounts();
  for (const row of jobGroups) {
    jobs[row.status] = row._count._all;
  }

  return {
    websites,
    jobs,
    queue: {
      ...redisCounts,
      mode: isQueueEnabled() ? "redis" : "database",
    },
    workers: {
      concurrency: QUEUE_WORKER_CONCURRENCY,
      activeLocks,
    },
  };
}

export async function listJobs(params: {
  status?: ProcessingJobStatus;
  websiteStatus?: WebsiteStatus;
  domain?: string;
  batchId?: string;
  page?: number;
  pageSize?: number;
}): Promise<JobListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 50), 200);
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProcessingJobWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.websiteStatus) where.website = { status: params.websiteStatus };
  if (params.domain) {
    where.website = {
      ...(where.website as Prisma.WebsiteWhereInput),
      domain: { contains: params.domain, mode: "insensitive" },
    };
  }
  if (params.batchId) {
    where.website = {
      ...(where.website as Prisma.WebsiteWhereInput),
      batchId: params.batchId,
    };
  }

  const [rows, total] = await Promise.all([
    prisma.processingJob.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        website: {
          select: {
            domain: true,
            normalizedUrl: true,
            status: true,
            batch: { select: { batchCode: true } },
          },
        },
      },
    }),
    prisma.processingJob.count({ where }),
  ]);

  const now = Date.now();

  const jobs: JobListItem[] = rows.map((row) => ({
    id: row.id,
    websiteId: row.websiteId,
    domain: row.website.domain,
    normalizedUrl: row.website.normalizedUrl,
    websiteStatus: row.website.status,
    jobStatus: row.status,
    currentStage: row.currentStage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    priority: row.priority,
    lastError: row.lastError,
    batchCode: row.website.batch.batchCode,
    waitMs: now - row.createdAt.getTime(),
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
  }));

  return { jobs, total, page, pageSize };
}

export async function retryJob(jobId: string): Promise<RetryJobResult> {
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: {
      website: { select: { normalizedUrl: true, domain: true } },
    },
  });

  if (!job) {
    throw new QueueError("Job not found", "JOB_NOT_FOUND");
  }

  if (job.status === ProcessingJobStatus.ACTIVE) {
    throw new QueueError("Cannot retry an active job", "JOB_ACTIVE");
  }

  if (job.status === ProcessingJobStatus.COMPLETED) {
    throw new QueueError("Job already completed", "JOB_COMPLETED");
  }

  await removeQueueJob(jobId);

  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      attempts: 0,
      maxAttempts: job.maxAttempts,
    },
  });

  const reset = await resetJobForRetry(jobId);
  const payload = buildPayload({
    id: reset.id,
    websiteId: reset.websiteId,
    website: reset.website,
  });

  const enqueued = await enqueuePipelineJob(payload, {
    priority: job.priority,
  });

  return { jobId, websiteId: job.websiteId, enqueued };
}

export async function cancelJob(
  jobId: string,
  reason = "Cancelled by operator",
): Promise<void> {
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new QueueError("Job not found", "JOB_NOT_FOUND");
  }

  if (job.status === ProcessingJobStatus.COMPLETED) {
    throw new QueueError("Job already completed", "JOB_COMPLETED");
  }

  await removeQueueJob(jobId);
  await markJobFailed(jobId, reason, { terminal: true });
}

export async function queueWebsite(websiteId: string): Promise<RetryJobResult> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!website) {
    throw new QueueError("Website not found", "WEBSITE_NOT_FOUND");
  }

  let job = website.jobs[0];

  if (!job || job.status === ProcessingJobStatus.COMPLETED) {
    job = await prisma.processingJob.create({
      data: {
        websiteId,
        jobType: "pipeline",
        status: ProcessingJobStatus.PENDING,
        payload: {
          normalizedUrl: website.normalizedUrl,
          domain: website.domain,
        },
      },
    });
  } else if (job.status === ProcessingJobStatus.ACTIVE) {
    throw new QueueError("Website is currently processing", "WEBSITE_PROCESSING");
  } else {
    await resetJobForRetry(job.id);
    job = await prisma.processingJob.findUniqueOrThrow({
      where: { id: job.id },
    });
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { status: WebsiteStatus.QUEUED },
  });

  const payload = buildPayload({
    id: job.id,
    websiteId,
    website: { normalizedUrl: website.normalizedUrl, domain: website.domain },
  });

  const enqueued = await enqueuePipelineJob(payload, { priority: job.priority });

  return { jobId: job.id, websiteId, enqueued };
}

export async function reconcilePendingJobs(): Promise<ReconcileResult> {
  const pending = await prisma.processingJob.findMany({
    where: {
      status: ProcessingJobStatus.PENDING,
      website: {
        status: { in: [WebsiteStatus.QUEUED, WebsiteStatus.NEW] },
      },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
    },
    include: {
      website: {
        select: { normalizedUrl: true, domain: true, status: true },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 500,
  });

  let enqueued = 0;
  let skipped = 0;

  for (const job of pending) {
    if (!isQueueEnabled()) {
      skipped += 1;
      continue;
    }

    const payload = buildPayload({
      id: job.id,
      websiteId: job.websiteId,
      website: job.website,
    });

    try {
      const ok = await enqueuePipelineJob(payload, { priority: job.priority });
      if (ok) {
        if (job.website.status === WebsiteStatus.NEW) {
          await prisma.website.update({
            where: { id: job.websiteId },
            data: { status: WebsiteStatus.QUEUED },
          });
        }
        enqueued += 1;
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  return { scanned: pending.length, enqueued, skipped };
}

function emptyWebsiteCounts(): Record<WebsiteStatus, number> {
  return {
    NEW: 0,
    QUEUED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
}

function emptyJobCounts(): Record<ProcessingJobStatus, number> {
  return {
    PENDING: 0,
    ACTIVE: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
}
