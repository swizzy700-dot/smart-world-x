import {
  ProcessingJobStatus,
  WebsiteStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import type { QueueStage } from "./constants";

type StageName = QueueStage | string;

type Tx = Prisma.TransactionClient;

export async function markJobActive(
  jobId: string,
  stage: StageName,
  options?: { attempts?: number; incrementAttempts?: boolean },
  tx?: Tx,
) {
  const db = tx ?? prisma;
  const now = new Date();

  const attemptUpdate =
    options?.attempts !== undefined
      ? { attempts: options.attempts }
      : options?.incrementAttempts === false
        ? {}
        : { attempts: { increment: 1 } };

  const job = await db.processingJob.update({
    where: { id: jobId },
    data: {
      status: ProcessingJobStatus.ACTIVE,
      currentStage: stage,
      startedAt: now,
      lockedAt: now,
      ...attemptUpdate,
      lastError: null,
    },
    select: { websiteId: true, attempts: true, maxAttempts: true },
  });

  await db.website.update({
    where: { id: job.websiteId },
    data: { status: WebsiteStatus.PROCESSING },
  });

  return job;
}

export async function markJobStage(jobId: string, stage: StageName, tx?: Tx) {
  const db = tx ?? prisma;
  return db.processingJob.update({
    where: { id: jobId },
    data: { currentStage: stage },
  });
}

export async function markJobCompleted(jobId: string, tx?: Tx) {
  const db = tx ?? prisma;
  const now = new Date();

  const job = await db.processingJob.update({
    where: { id: jobId },
    data: {
      status: ProcessingJobStatus.COMPLETED,
      currentStage: "complete",
      completedAt: now,
      lockedAt: null,
      lockToken: null,
      lastError: null,
    },
    select: { websiteId: true },
  });

  await db.website.update({
    where: { id: job.websiteId },
    data: { status: WebsiteStatus.COMPLETED },
  });

  return job;
}

export async function markJobFailed(
  jobId: string,
  error: string,
  options?: { terminal?: boolean },
  tx?: Tx,
) {
  const db = tx ?? prisma;
  const job = await db.processingJob.findUnique({
    where: { id: jobId },
    select: {
      attempts: true,
      maxAttempts: true,
      websiteId: true,
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const terminal =
    options?.terminal ?? job.attempts >= job.maxAttempts;

  const updated = await db.processingJob.update({
    where: { id: jobId },
    data: {
      status: terminal
        ? ProcessingJobStatus.FAILED
        : ProcessingJobStatus.PENDING,
      currentStage: terminal ? "failed" : "retry",
      lastError: error.slice(0, 2000),
      completedAt: terminal ? new Date() : null,
      lockedAt: null,
      lockToken: null,
    },
    select: { websiteId: true, status: true },
  });

  await db.website.update({
    where: { id: job.websiteId },
    data: {
      status: terminal ? WebsiteStatus.FAILED : WebsiteStatus.QUEUED,
    },
  });

  return { job: updated, terminal, canRetry: !terminal };
}

export async function resetJobForRetry(jobId: string, tx?: Tx) {
  const db = tx ?? prisma;

  const job = await db.processingJob.update({
    where: { id: jobId },
    data: {
      status: ProcessingJobStatus.PENDING,
      currentStage: "queued",
      lastError: null,
      lockedAt: null,
      lockToken: null,
      startedAt: null,
      completedAt: null,
      scheduledAt: null,
    },
    select: {
      id: true,
      websiteId: true,
      payload: true,
      website: {
        select: {
          normalizedUrl: true,
          domain: true,
        },
      },
    },
  });

  await db.website.update({
    where: { id: job.websiteId },
    data: { status: WebsiteStatus.QUEUED },
  });

  return job;
}
