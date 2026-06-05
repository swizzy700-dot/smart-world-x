import { OutreachStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildOutreachContext,
  serializeContextSnapshot,
} from "./context-builder";
import { getOutreachProvider } from "./providers/registry";
import { OutreachProviderError } from "./providers/types";
import type { OutreachDraftRecord } from "./types";

export class OutreachError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "OutreachError";
  }
}

export async function runOutreachGeneration(
  websiteId: string,
): Promise<OutreachDraftRecord> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, domain: true, normalizedUrl: true },
  });

  if (!website) {
    throw new OutreachError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const latest = await prisma.outreachDraft.findFirst({
    where: { websiteId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (latest?.version ?? 0) + 1;

  const draft = await prisma.outreachDraft.create({
    data: {
      websiteId,
      version: nextVersion,
      status: OutreachStatus.GENERATING,
    },
  });

  try {
    const context = await buildOutreachContext(websiteId);
    const provider = getOutreachProvider();
    const result = await provider.generate(context);

    const updated = await prisma.outreachDraft.update({
      where: { id: draft.id },
      data: {
        status: OutreachStatus.GENERATED,
        subject: result.subject,
        body: result.body,
        recipientEmail: result.recipientEmail,
        recipientName: result.recipientName,
        provider: result.provider,
        providerModel: result.providerModel,
        promptVersion: result.promptVersion,
        inputSnapshot: serializeContextSnapshot(
          context,
        ) as Prisma.InputJsonValue,
        generationMeta: (result.meta ?? {}) as Prisma.InputJsonValue,
        generatedAt: new Date(),
        errorMessage: null,
      },
      include: {
        website: { select: { domain: true, normalizedUrl: true } },
      },
    });

    return toRecord(updated);
  } catch (error) {
    const message =
      error instanceof OutreachProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Outreach generation failed";

    await prisma.outreachDraft.update({
      where: { id: draft.id },
      data: {
        status: OutreachStatus.FAILED,
        errorMessage: message.slice(0, 2000),
        generatedAt: new Date(),
      },
    });

    throw new OutreachError(message, "GENERATION_FAILED");
  }
}

export async function getLatestOutreach(
  websiteId: string,
): Promise<OutreachDraftRecord | null> {
  const row = await prisma.outreachDraft.findFirst({
    where: { websiteId },
    orderBy: { version: "desc" },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
    },
  });

  if (!row) return null;
  return toRecord(row);
}

export async function listOutreachDrafts(params: {
  websiteId?: string;
  status?: OutreachStatus;
  domain?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.OutreachDraftWhereInput = {};
  if (params.websiteId) where.websiteId = params.websiteId;
  if (params.status) where.status = params.status;
  if (params.domain) {
    where.website = {
      domain: { contains: params.domain, mode: "insensitive" },
    };
  }

  const [rows, total] = await Promise.all([
    prisma.outreachDraft.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ generatedAt: "desc" }, { version: "desc" }],
      include: {
        website: { select: { domain: true, normalizedUrl: true } },
      },
    }),
    prisma.outreachDraft.count({ where }),
  ]);

  return {
    drafts: rows.map((row) => ({
      id: row.id,
      websiteId: row.websiteId,
      version: row.version,
      domain: row.website.domain,
      status: row.status,
      subject: row.subject,
      provider: row.provider,
      generatedAt: row.generatedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

function toRecord(row: {
  id: string;
  websiteId: string;
  version: number;
  status: OutreachStatus;
  subject: string | null;
  body: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  provider: OutreachDraftRecord["provider"];
  providerModel: string | null;
  promptVersion: string;
  errorMessage: string | null;
  generatedAt: Date | null;
  website: { domain: string; normalizedUrl: string };
}): OutreachDraftRecord {
  return {
    id: row.id,
    websiteId: row.websiteId,
    version: row.version,
    status: row.status,
    subject: row.subject,
    body: row.body,
    recipientEmail: row.recipientEmail,
    recipientName: row.recipientName,
    provider: row.provider,
    providerModel: row.providerModel,
    promptVersion: row.promptVersion,
    errorMessage: row.errorMessage,
    generatedAt: row.generatedAt?.toISOString() ?? null,
    website: row.website,
  };
}
