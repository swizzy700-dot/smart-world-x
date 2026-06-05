import {
  EmailDeliveryStatus,
  FollowUpStatus,
  ReplyStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  FollowUpHistoryRecord,
  FollowUpScheduleInput,
  FollowUpScheduleRecord,
  FollowUpStats,
  ReplyRecord,
  ReplyStats,
} from "./types";

export class FollowUpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FollowUpError";
  }
}

const FOLLOW_UP_SCHEDULE = [
  { days: 3, sequence: 1 },
  { days: 7, sequence: 2 },
  { days: 14, sequence: 3 },
];

export async function createFollowUpSchedule(
  input: FollowUpScheduleInput,
): Promise<FollowUpScheduleRecord> {
  const website = await prisma.website.findUnique({
    where: { id: input.websiteId },
  });

  if (!website) {
    throw new FollowUpError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const initialEmail = await prisma.emailMessage.findUnique({
    where: { id: input.initialEmailId },
  });

  if (!initialEmail) {
    throw new FollowUpError("Initial email not found", "EMAIL_NOT_FOUND");
  }

  if (initialEmail.websiteId !== input.websiteId) {
    throw new FollowUpError("Email does not belong to this website", "INVALID_EMAIL");
  }

  if (initialEmail.status !== EmailDeliveryStatus.SENT) {
    throw new FollowUpError(
      "Initial email must be sent before scheduling follow-ups",
      "EMAIL_NOT_SENT",
    );
  }

  const existing = await prisma.followUpSchedule.findUnique({
    where: {
      websiteId_sequence: {
        websiteId: input.websiteId,
        sequence: input.sequence,
      },
    },
  });

  if (existing) {
    throw new FollowUpError(
      `Follow-up sequence ${input.sequence} already exists for this website`,
      "ALREADY_EXISTS",
    );
  }

  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + input.scheduledDays);

  const schedule = await prisma.followUpSchedule.create({
    data: {
      websiteId: input.websiteId,
      initialEmailId: input.initialEmailId,
      sequence: input.sequence,
      scheduledDays: input.scheduledDays,
      status: FollowUpStatus.SCHEDULED,
      scheduledFor,
    },
  });

  return toScheduleRecord(schedule);
}

export async function createAllFollowUpSchedules(
  websiteId: string,
  initialEmailId: string,
): Promise<FollowUpScheduleRecord[]> {
  const schedules: FollowUpScheduleRecord[] = [];

  for (const config of FOLLOW_UP_SCHEDULE) {
    try {
      const schedule = await createFollowUpSchedule({
        websiteId,
        initialEmailId,
        scheduledDays: config.days,
        sequence: config.sequence,
      });
      schedules.push(schedule);
    } catch (error) {
      if (error instanceof FollowUpError && error.code === "ALREADY_EXISTS") {
        continue;
      }
      throw error;
    }
  }

  return schedules;
}

export async function getFollowUpSchedule(
  id: string,
): Promise<FollowUpScheduleRecord | null> {
  const schedule = await prisma.followUpSchedule.findUnique({
    where: { id },
  });

  if (!schedule) return null;
  return toScheduleRecord(schedule);
}

export async function getFollowUpSchedulesByWebsite(
  websiteId: string,
): Promise<FollowUpScheduleRecord[]> {
  const schedules = await prisma.followUpSchedule.findMany({
    where: { websiteId },
    orderBy: { sequence: "asc" },
  });

  return schedules.map(toScheduleRecord);
}

export async function getScheduledFollowUps(): Promise<FollowUpScheduleRecord[]> {
  const now = new Date();

  const schedules = await prisma.followUpSchedule.findMany({
    where: {
      status: FollowUpStatus.SCHEDULED,
      scheduledFor: { lte: now },
      stoppedDueToReply: false,
    },
    include: {
      website: {
        select: {
          domain: true,
          normalizedUrl: true,
        },
      },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return schedules.map(toScheduleRecord);
}

export async function cancelFollowUpSchedule(
  id: string,
  reason?: string,
): Promise<FollowUpScheduleRecord> {
  const schedule = await prisma.followUpSchedule.update({
    where: { id },
    data: {
      status: FollowUpStatus.CANCELLED,
      cancelledAt: new Date(),
      skippedReason: reason,
    },
  });

  return toScheduleRecord(schedule);
}

export async function stopFollowUpsDueToReply(
  websiteId: string,
): Promise<void> {
  await prisma.followUpSchedule.updateMany({
    where: {
      websiteId,
      status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] },
    },
    data: {
      status: FollowUpStatus.SKIPPED,
      skippedReason: "Reply received",
      stoppedDueToReply: true,
      cancelledAt: new Date(),
    },
  });
}

export async function markFollowUpAsSent(
  scheduleId: string,
  emailMessageId: string,
): Promise<FollowUpScheduleRecord> {
  const schedule = await prisma.followUpSchedule.update({
    where: { id: scheduleId },
    data: {
      status: FollowUpStatus.SENT,
      sentAt: new Date(),
    },
  });

  await prisma.followUpHistory.create({
    data: {
      websiteId: schedule.websiteId,
      scheduleId: schedule.id,
      emailMessageId,
      sequence: schedule.sequence,
      followUpType: `FOLLOW_UP_${schedule.sequence}`,
      subject: "Follow-up",
      body: "",
      sentAt: new Date(),
    },
  });

  return toScheduleRecord(schedule);
}

export async function recordReply(
  websiteId: string,
  originalEmailId: string,
  data: {
    replySubject?: string;
    replyBody?: string;
    replyFrom?: string;
    replyDate?: Date;
  },
): Promise<ReplyRecord> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    throw new FollowUpError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const originalEmail = await prisma.emailMessage.findUnique({
    where: { id: originalEmailId },
  });

  if (!originalEmail) {
    throw new FollowUpError("Original email not found", "EMAIL_NOT_FOUND");
  }

  const reply = await prisma.reply.create({
    data: {
      websiteId,
      originalEmailId,
      status: ReplyStatus.RECEIVED,
      replySubject: data.replySubject,
      replyBody: data.replyBody,
      replyFrom: data.replyFrom,
      replyDate: data.replyDate || new Date(),
      detectedAt: new Date(),
    },
  });

  await stopFollowUpsDueToReply(websiteId);

  return toReplyRecord(reply);
}

export async function getRepliesByWebsite(
  websiteId: string,
): Promise<ReplyRecord[]> {
  const replies = await prisma.reply.findMany({
    where: { websiteId },
    orderBy: { detectedAt: "desc" },
  });

  return replies.map(toReplyRecord);
}

export async function getFollowUpHistory(
  websiteId: string,
): Promise<FollowUpHistoryRecord[]> {
  const history = await prisma.followUpHistory.findMany({
    where: { websiteId },
    orderBy: { sentAt: "desc" },
  });

  return history.map(toHistoryRecord);
}

export async function listFollowUpSchedules(params: {
  status?: FollowUpStatus;
  websiteId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.FollowUpScheduleWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.websiteId) where.websiteId = params.websiteId;

  const [schedules, total] = await Promise.all([
    prisma.followUpSchedule.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { scheduledFor: "desc" },
      include: {
        website: {
          select: {
            domain: true,
            normalizedUrl: true,
          },
        },
      },
    }),
    prisma.followUpSchedule.count({ where }),
  ]);

  return {
    schedules: schedules.map((s) => ({
      ...toScheduleRecord(s),
      domain: s.website.domain,
      normalizedUrl: s.website.normalizedUrl,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getFollowUpStats(): Promise<FollowUpStats> {
  const groups = await prisma.followUpSchedule.groupBy({
    by: ["status", "stoppedDueToReply"],
    _count: { _all: true },
  });

  const stats: FollowUpStats = {
    total: 0,
    pending: 0,
    scheduled: 0,
    sent: 0,
    cancelled: 0,
    skipped: 0,
    stoppedDueToReply: 0,
  };

  for (const group of groups) {
    stats.total += group._count._all;

    if (group.status === FollowUpStatus.PENDING) stats.pending = group._count._all;
    if (group.status === FollowUpStatus.SCHEDULED) stats.scheduled = group._count._all;
    if (group.status === FollowUpStatus.SENT) stats.sent = group._count._all;
    if (group.status === FollowUpStatus.CANCELLED) stats.cancelled = group._count._all;
    if (group.status === FollowUpStatus.SKIPPED) stats.skipped = group._count._all;
    if (group.stoppedDueToReply) stats.stoppedDueToReply += group._count._all;
  }

  return stats;
}

export async function getReplyStats(): Promise<ReplyStats> {
  const groups = await prisma.reply.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const stats: ReplyStats = {
    total: 0,
    pending: 0,
    received: 0,
    failed: 0,
  };

  for (const group of groups) {
    stats.total += group._count._all;
    if (group.status === ReplyStatus.PENDING) stats.pending = group._count._all;
    if (group.status === ReplyStatus.RECEIVED) stats.received = group._count._all;
    if (group.status === ReplyStatus.FAILED) stats.failed = group._count._all;
  }

  return stats;
}

function toScheduleRecord(schedule: {
  id: string;
  websiteId: string;
  initialEmailId: string;
  sequence: number;
  scheduledDays: number;
  status: FollowUpStatus;
  scheduledFor: Date | null;
  sentAt: Date | null;
  cancelledAt: Date | null;
  skippedReason: string | null;
  stoppedDueToReply: boolean;
  createdAt: Date;
  updatedAt: Date;
}): FollowUpScheduleRecord {
  return {
    id: schedule.id,
    websiteId: schedule.websiteId,
    initialEmailId: schedule.initialEmailId,
    sequence: schedule.sequence,
    scheduledDays: schedule.scheduledDays,
    status: schedule.status,
    scheduledFor: schedule.scheduledFor?.toISOString() ?? null,
    sentAt: schedule.sentAt?.toISOString() ?? null,
    cancelledAt: schedule.cancelledAt?.toISOString() ?? null,
    skippedReason: schedule.skippedReason ?? null,
    stoppedDueToReply: schedule.stoppedDueToReply,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

function toReplyRecord(reply: {
  id: string;
  websiteId: string;
  originalEmailId: string;
  status: ReplyStatus;
  replySubject: string | null;
  replyBody: string | null;
  replyFrom: string | null;
  replyDate: Date | null;
  errorMessage: string | null;
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ReplyRecord {
  return {
    id: reply.id,
    websiteId: reply.websiteId,
    originalEmailId: reply.originalEmailId,
    status: reply.status,
    replySubject: reply.replySubject ?? null,
    replyBody: reply.replyBody ?? null,
    replyFrom: reply.replyFrom ?? null,
    replyDate: reply.replyDate?.toISOString() ?? null,
    errorMessage: reply.errorMessage ?? null,
    detectedAt: reply.detectedAt.toISOString(),
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
  };
}

function toHistoryRecord(history: {
  id: string;
  websiteId: string;
  scheduleId: string | null;
  emailMessageId: string;
  sequence: number;
  followUpType: string;
  subject: string;
  body: string;
  sentAt: Date;
  createdAt: Date;
}): FollowUpHistoryRecord {
  return {
    id: history.id,
    websiteId: history.websiteId,
    scheduleId: history.scheduleId ?? null,
    emailMessageId: history.emailMessageId,
    sequence: history.sequence,
    followUpType: history.followUpType,
    subject: history.subject,
    body: history.body,
    sentAt: history.sentAt.toISOString(),
    createdAt: history.createdAt.toISOString(),
  };
}
