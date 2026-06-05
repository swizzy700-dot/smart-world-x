import type { FollowUpStatus, ReplyStatus } from "@prisma/client";

export interface FollowUpContext {
  website: {
    domain: string;
    normalizedUrl: string;
    pageTitle: string | null;
  };
  analysis: {
    overallScore: number | null;
    weakestCategory: string | null;
    executiveSummary: string | null;
  } | null;
  recipientName: string | null;
  recipientEmail: string | null;
}

export interface FollowUpScheduleInput {
  websiteId: string;
  initialEmailId: string;
  scheduledDays: number;
  sequence: number;
}

export interface FollowUpScheduleRecord {
  id: string;
  websiteId: string;
  initialEmailId: string;
  sequence: number;
  scheduledDays: number;
  status: FollowUpStatus;
  scheduledFor: string | null;
  sentAt: string | null;
  cancelledAt: string | null;
  skippedReason: string | null;
  stoppedDueToReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpHistoryRecord {
  id: string;
  websiteId: string;
  scheduleId: string | null;
  emailMessageId: string;
  sequence: number;
  followUpType: string;
  subject: string;
  body: string;
  sentAt: string;
  createdAt: string;
}

export interface ReplyRecord {
  id: string;
  websiteId: string;
  originalEmailId: string;
  status: ReplyStatus;
  replySubject: string | null;
  replyBody: string | null;
  replyFrom: string | null;
  replyDate: string | null;
  errorMessage: string | null;
  detectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpStats {
  total: number;
  pending: number;
  scheduled: number;
  sent: number;
  cancelled: number;
  skipped: number;
  stoppedDueToReply: number;
}

export interface ReplyStats {
  total: number;
  pending: number;
  received: number;
  failed: number;
}

export interface FollowUpQueuePayload {
  scheduleId: string;
}
