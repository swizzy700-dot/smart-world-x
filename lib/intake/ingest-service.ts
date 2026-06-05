import { WebsiteStatus, ProcessingJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { QUEUE_MAX_ATTEMPTS } from "@/lib/queue/constants";
import { enqueuePipelineJobs, isQueueEnabled } from "@/lib/queue/producer";
import type { PipelineJobPayload } from "@/lib/queue/types";
import { INTAKE_DB_CHUNK_SIZE, INTAKE_MAX_BATCH_SIZE } from "./constants";
import { dedupeWithinBatch, findExistingNormalizedUrls } from "./dedupe";
import { parseUrlLines } from "./parse-urls";
import type {
  IntakeExecuteOptions,
  IntakeExecuteResult,
  IntakePreviewItem,
  IntakePreviewResult,
  IntakeStats,
  InvalidUrl,
  ValidatedUrl,
} from "./types";
import { validateUrlLine } from "./validate-url";

function generateBatchCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BATCH-${date}-${time}-${suffix}`;
}

export function processIntakeInput(input: string): {
  validated: ValidatedUrl[];
  invalid: InvalidUrl[];
  stats: IntakeStats;
  previewItems: IntakePreviewItem[];
} {
  const parsed = parseUrlLines(input);

  if (parsed.length > INTAKE_MAX_BATCH_SIZE) {
    throw new IntakeError(
      `Batch exceeds maximum of ${INTAKE_MAX_BATCH_SIZE} URLs`,
      "BATCH_TOO_LARGE",
    );
  }

  const validated: ValidatedUrl[] = [];
  const invalid: InvalidUrl[] = [];
  const previewItems: IntakePreviewItem[] = [];

  for (const line of parsed) {
    const result = validateUrlLine(line);
    if ("reason" in result) {
      invalid.push(result);
      previewItems.push({
        lineNumber: result.lineNumber,
        raw: result.raw,
        outcome: "invalid",
        reason: result.reason,
      });
    } else {
      validated.push(result);
      previewItems.push({
        lineNumber: result.lineNumber,
        raw: result.raw,
        outcome: "valid",
        normalizedUrl: result.normalizedUrl,
        domain: result.domain,
      });
    }
  }

  const { unique, duplicates: batchDupes } = dedupeWithinBatch(validated);

  for (const dup of batchDupes) {
    const idx = previewItems.findIndex(
      (p) => p.lineNumber === dup.lineNumber && p.outcome === "valid",
    );
    if (idx !== -1) {
      previewItems[idx] = {
        ...previewItems[idx],
        outcome: "duplicate_batch",
        reason: "Duplicate within batch",
      };
    }
  }

  const stats: IntakeStats = {
    totalLines: parsed.length,
    valid: validated.length,
    invalid: invalid.length,
    duplicateBatch: batchDupes.length,
    duplicateDb: 0,
    readyToInsert: unique.length,
  };

  return { validated: unique, invalid, stats, previewItems };
}

export async function previewIntake(input: string): Promise<IntakePreviewResult> {
  const { validated, stats, previewItems } = processIntakeInput(input);

  const existing = await findExistingNormalizedUrls(
    validated.map((v) => v.normalizedUrl),
    async (urls) => {
      const rows = await prisma.website.findMany({
        where: { normalizedUrl: { in: urls } },
        select: { normalizedUrl: true },
      });
      return new Set(rows.map((r) => r.normalizedUrl));
    },
  );

  let duplicateDb = 0;
  const items = previewItems.map((item) => {
    if (item.outcome !== "valid" || !item.normalizedUrl) return item;
    if (existing.has(item.normalizedUrl)) {
      duplicateDb += 1;
      return {
        ...item,
        outcome: "duplicate_db" as const,
        reason: "Already in database",
      };
    }
    return item;
  });

  const readyToInsert = validated.filter(
    (v) => !existing.has(v.normalizedUrl),
  ).length;

  return {
    items,
    stats: {
      ...stats,
      duplicateDb,
      readyToInsert,
    },
  };
}

export async function executeIntake(
  input: string,
  options: IntakeExecuteOptions = {},
): Promise<IntakeExecuteResult> {
  const { validated, invalid, stats } = processIntakeInput(input);

  const existing = await findExistingNormalizedUrls(
    validated.map((v) => v.normalizedUrl),
    async (urls) => {
      const rows = await prisma.website.findMany({
        where: { normalizedUrl: { in: urls } },
        select: { normalizedUrl: true },
      });
      return new Set(rows.map((r) => r.normalizedUrl));
    },
  );

  const toInsert = validated.filter((v) => !existing.has(v.normalizedUrl));
  const duplicateDb = validated.length - toInsert.length;

  const batch = await prisma.intakeBatch.create({
    data: {
      batchCode: generateBatchCode(),
      totalLines: stats.totalLines,
      validCount: stats.valid,
      insertedCount: 0,
      duplicateCount: stats.duplicateBatch + duplicateDb,
      invalidCount: invalid.length,
    },
  });

  const websiteIds: string[] = [];
  const jobIds: string[] = [];
  const queuePayloads: PipelineJobPayload[] = [];
  const autoQueue = options.autoQueue !== false;

  for (let i = 0; i < toInsert.length; i += INTAKE_DB_CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + INTAKE_DB_CHUNK_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const item of chunk) {
        const website = await tx.website.create({
          data: {
            rawUrl: item.raw,
            normalizedUrl: item.normalizedUrl,
            domain: item.domain,
            status: WebsiteStatus.NEW,
            batchId: batch.id,
          },
        });

        const job = await tx.processingJob.create({
          data: {
            websiteId: website.id,
            jobType: "pipeline",
            status: ProcessingJobStatus.PENDING,
            maxAttempts: QUEUE_MAX_ATTEMPTS,
            payload: {
              normalizedUrl: item.normalizedUrl,
              domain: item.domain,
              tags: options.tags ?? [],
            },
          },
        });

        websiteIds.push(website.id);
        jobIds.push(job.id);

        if (autoQueue) {
          await tx.website.update({
            where: { id: website.id },
            data: { status: WebsiteStatus.QUEUED },
          });

          queuePayloads.push({
            websiteId: website.id,
            jobId: job.id,
            normalizedUrl: item.normalizedUrl,
            domain: item.domain,
          });
        }
      }
    });
  }

  if (autoQueue && queuePayloads.length > 0) {
    await enqueuePipelineJobs(queuePayloads);
  }

  await prisma.intakeBatch.update({
    where: { id: batch.id },
    data: { insertedCount: websiteIds.length },
  });

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    stats: {
      totalLines: stats.totalLines,
      valid: stats.valid,
      invalid: invalid.length,
      duplicateBatch: stats.duplicateBatch,
      duplicateDb,
      readyToInsert: toInsert.length,
      inserted: websiteIds.length,
      queued: autoQueue ? websiteIds.length : 0,
    },
    websiteIds,
    jobIds,
  };
}

export class IntakeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "IntakeError";
  }
}

export { isQueueEnabled };
