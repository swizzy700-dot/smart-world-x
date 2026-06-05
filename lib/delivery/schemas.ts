import { EmailDeliveryStatus } from "@prisma/client";
import { z } from "zod";

export const queueEmailSchema = z.object({
  websiteId: z.string().cuid(),
  outreachDraftId: z.string().cuid().optional(),
  toAddress: z.string().email().optional(),
  toName: z.string().max(120).optional(),
  fromAddress: z.string().email().optional(),
});

export const emailListQuerySchema = z.object({
  status: z.nativeEnum(EmailDeliveryStatus).optional(),
  domain: z.string().max(253).optional(),
  websiteId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
