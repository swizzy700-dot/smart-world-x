import { z } from "zod";

export const createFollowUpScheduleSchema = z.object({
  websiteId: z.string().cuid(),
  initialEmailId: z.string().cuid(),
  scheduledDays: z.number().int().positive(),
  sequence: z.number().int().positive().default(1),
});

export const updateFollowUpScheduleSchema = z.object({
  status: z.enum(["PENDING", "SCHEDULED", "SENT", "CANCELLED", "SKIPPED"]).optional(),
  scheduledFor: z.string().datetime().optional(),
  skippedReason: z.string().optional(),
});

export const recordReplySchema = z.object({
  websiteId: z.string().cuid(),
  originalEmailId: z.string().cuid(),
  replySubject: z.string().optional(),
  replyBody: z.string().optional(),
  replyFrom: z.string().email().optional(),
  replyDate: z.string().datetime().optional(),
});

export const followUpListQuerySchema = z.object({
  status: z.enum(["PENDING", "SCHEDULED", "SENT", "CANCELLED", "SKIPPED"]).optional(),
  websiteId: z.string().cuid().optional(),
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  pageSize: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
});
