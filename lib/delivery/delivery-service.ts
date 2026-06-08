import { EmailDeliveryStatus, OutreachStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isQueueEnabled } from "@/lib/queue/connection";
import { logEmailActivity } from "./activity";
import { SMTP_FROM } from "./constants";
import { enqueueEmailDelivery, getEmailQueue } from "./email-queue";
import { fetchSimpleQueueCounts } from "@/lib/queue/queue-counts";
import {
  canUseRedisRead,
  clearRedisReadDegraded,
  markRedisReadDegraded,
} from "@/lib/system/redis-read-guard";
import {
  dbDerivedEmailCounts,
  getLastEmailCounts,
  rememberEmailCounts,
} from "@/lib/system/redis-snapshot";
import { executeEmailSend } from "./send-email";
import { isSmtpConfigured } from "./smtp-client";
import { createAllFollowUpSchedules } from "@/lib/followup";
import { assertSystemRunning } from "@/lib/system/system-guard";
import type {
  DeliveryStats,
  EmailMessageRecord,
  QueueEmailInput,
} from "./types";

export class DeliveryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DeliveryError";
  }
}

export async function queueOutboundEmail(
  input: QueueEmailInput,
): Promise<EmailMessageRecord> {
  if (!isSmtpConfigured()) {
    throw new DeliveryError(
      "SMTP is not configured. Set SMTP_HOST and SMTP_FROM in environment.",
      "SMTP_NOT_CONFIGURED",
    );
  }

  const website = await prisma.website.findUnique({
    where: { id: input.websiteId },
    select: { id: true, domain: true, normalizedUrl: true },
  });

  if (!website) {
    throw new DeliveryError("Website not found", "WEBSITE_NOT_FOUND");
  }

  let draft = null;
  if (input.outreachDraftId) {
    draft = await prisma.outreachDraft.findUnique({
      where: { id: input.outreachDraftId },
    });
  } else {
    draft = await prisma.outreachDraft.findFirst({
      where: {
        websiteId: input.websiteId,
        status: OutreachStatus.GENERATED,
      },
      orderBy: { version: "desc" },
    });
  }

  if (!draft?.subject || !draft?.body) {
    throw new DeliveryError(
      "No generated outreach draft available",
      "NO_OUTREACH_DRAFT",
    );
  }

  const toAddress = input.toAddress ?? draft.recipientEmail;
  if (!toAddress) {
    throw new DeliveryError(
      "No recipient email address",
      "NO_RECIPIENT",
    );
  }

  const fromAddress = input.fromAddress ?? SMTP_FROM;
  if (!fromAddress) {
    throw new DeliveryError("SMTP_FROM is not configured", "SMTP_NOT_CONFIGURED");
  }

  const existingPending = await prisma.emailMessage.findFirst({
    where: {
      websiteId: input.websiteId,
      outreachDraftId: draft.id,
      status: { in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.SENDING] },
    },
  });

  if (existingPending) {
    throw new DeliveryError(
      "An email for this outreach is already queued or sending",
      "ALREADY_QUEUED",
    );
  }

  const emailMessage = await prisma.emailMessage.create({
    data: {
      websiteId: input.websiteId,
      outreachDraftId: draft.id,
      status: EmailDeliveryStatus.PENDING,
      fromAddress,
      toAddress,
      toName: input.toName ?? draft.recipientName,
      subject: draft.subject,
      bodyText: draft.body,
      maxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS ?? 3),
    },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  await logEmailActivity(
    emailMessage.id,
    "QUEUED",
    `Email queued to ${toAddress}`,
    { subject: draft.subject, outreachDraftId: draft.id },
  );

  const enqueued = await enqueueEmailDelivery({
    emailMessageId: emailMessage.id,
  });

  if (!enqueued && !isQueueEnabled()) {
    await logEmailActivity(
      emailMessage.id,
      "QUEUED",
      "Awaiting database poller (REDIS_URL not set)",
    );
  }

  // Auto-schedule follow-ups if requested and this is an initial outreach email
  if (input.scheduleFollowUps && !input.outreachDraftId) {
    try {
      await createAllFollowUpSchedules(input.websiteId, emailMessage.id);
      await logEmailActivity(
        emailMessage.id,
        "QUEUED",
        "Follow-ups scheduled for Day 3, 7, and 14",
      );
    } catch (error) {
      console.error("Failed to schedule follow-ups:", error);
    }
  }

  return toRecord(emailMessage);
}

export async function retryEmailDelivery(
  emailMessageId: string,
): Promise<EmailMessageRecord> {
  await assertSystemRunning();

  const msg = await prisma.emailMessage.findUnique({
    where: { id: emailMessageId },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!msg) {
    throw new DeliveryError("Email message not found", "NOT_FOUND");
  }

  if (msg.status === EmailDeliveryStatus.SENT) {
    throw new DeliveryError("Email already sent", "ALREADY_SENT");
  }

  if (msg.status === EmailDeliveryStatus.SENDING) {
    throw new DeliveryError("Email is currently sending", "SENDING");
  }

  await prisma.emailMessage.update({
    where: { id: emailMessageId },
    data: {
      status: EmailDeliveryStatus.PENDING,
      attempts: 0,
      lastError: null,
      failedAt: null,
    },
  });

  await logEmailActivity(emailMessageId, "RETRY", "Manual retry requested");

  await enqueueEmailDelivery({ emailMessageId });

  const updated = await getEmailMessage(emailMessageId);
  return updated!;
}

export async function getEmailMessage(
  emailMessageId: string,
): Promise<EmailMessageRecord | null> {
  const row = await prisma.emailMessage.findUnique({
    where: { id: emailMessageId },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!row) return null;
  return toRecord(row);
}

export async function getEmailsByWebsiteId(
  websiteId: string,
): Promise<EmailMessageRecord[]> {
  const rows = await prisma.emailMessage.findMany({
    where: { websiteId },
    orderBy: { createdAt: "desc" },
    include: {
      website: { select: { domain: true, normalizedUrl: true } },
      activities: { orderBy: { createdAt: "asc" } },
    },
  });

  return rows.map(toRecord);
}

export async function listEmailMessages(params: {
  status?: EmailDeliveryStatus;
  domain?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.EmailMessageWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.domain) {
    where.website = {
      domain: { contains: params.domain, mode: "insensitive" },
    };
  }

  const [rows, total] = await Promise.all([
    prisma.emailMessage.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { queuedAt: "desc" },
      include: {
        website: { select: { domain: true, normalizedUrl: true } },
        activities: { take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.emailMessage.count({ where }),
  ]);

  return {
    messages: rows.map((row) => ({
      id: row.id,
      websiteId: row.websiteId,
      domain: row.website.domain,
      status: row.status,
      toAddress: row.toAddress,
      subject: row.subject,
      attempts: row.attempts,
      queuedAt: row.queuedAt.toISOString(),
      sentAt: row.sentAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getDeliveryStats(): Promise<DeliveryStats> {
  const groups = await prisma.emailMessage.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = {
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
  };

  for (const g of groups) {
    if (g.status === EmailDeliveryStatus.PENDING) counts.pending = g._count._all;
    if (g.status === EmailDeliveryStatus.SENDING) counts.sending = g._count._all;
    if (g.status === EmailDeliveryStatus.SENT) counts.sent = g._count._all;
    if (g.status === EmailDeliveryStatus.FAILED) counts.failed = g._count._all;
  }

  let queueCounts = dbDerivedEmailCounts(counts.pending, counts.sending);

  if (isQueueEnabled() && (await canUseRedisRead())) {
    try {
      const queue = getEmailQueue();
      queueCounts = await fetchSimpleQueueCounts(queue, "email-queue-counts");
      rememberEmailCounts(queueCounts);
      clearRedisReadDegraded();
    } catch (error) {
      markRedisReadDegraded(error);
      const snapshot = getLastEmailCounts();
      queueCounts =
        snapshot.waiting > 0 || snapshot.active > 0
          ? snapshot
          : dbDerivedEmailCounts(counts.pending, counts.sending);
    }
  } else if (isQueueEnabled()) {
    const snapshot = getLastEmailCounts();
    queueCounts =
      snapshot.waiting > 0 || snapshot.active > 0
        ? snapshot
        : dbDerivedEmailCounts(counts.pending, counts.sending);
  }

  return {
    ...counts,
    queue: {
      ...queueCounts,
      mode: isQueueEnabled() ? "redis" : "database",
    },
  };
}

export async function processPendingEmail(emailMessageId: string): Promise<void> {
  await executeEmailSend(emailMessageId);
}

function toRecord(row: {
  id: string;
  websiteId: string;
  outreachDraftId: string | null;
  status: EmailDeliveryStatus;
  fromAddress: string;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string;
  messageId: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  queuedAt: Date;
  sentAt: Date | null;
  failedAt: Date | null;
  website: { domain: string; normalizedUrl: string };
  activities: {
    id: string;
    type: EmailMessageRecord["activities"][0]["type"];
    message: string;
    metadata: unknown;
    createdAt: Date;
  }[];
}): EmailMessageRecord {
  return {
    id: row.id,
    websiteId: row.websiteId,
    outreachDraftId: row.outreachDraftId,
    status: row.status,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    toName: row.toName,
    subject: row.subject,
    bodyText: row.bodyText,
    messageId: row.messageId,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError,
    queuedAt: row.queuedAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    website: row.website,
    activities: row.activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      metadata: (a.metadata as Record<string, unknown>) ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
