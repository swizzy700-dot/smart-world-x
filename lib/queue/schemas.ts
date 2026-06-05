import { ProcessingJobStatus, WebsiteStatus } from "@prisma/client";
import { z } from "zod";

export const jobListQuerySchema = z.object({
  status: z.nativeEnum(ProcessingJobStatus).optional(),
  websiteStatus: z.nativeEnum(WebsiteStatus).optional(),
  domain: z.string().max(253).optional(),
  batchId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export const cancelJobSchema = z.object({
  reason: z.string().max(500).optional(),
});
