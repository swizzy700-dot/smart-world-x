import { OutreachStatus } from "@prisma/client";
import { z } from "zod";

export const outreachListQuerySchema = z.object({
  websiteId: z.string().cuid().optional(),
  status: z.nativeEnum(OutreachStatus).optional(),
  domain: z.string().max(253).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
