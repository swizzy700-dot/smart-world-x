import { ExtractionStatus } from "@prisma/client";
import { z } from "zod";

export const contactListQuerySchema = z.object({
  status: z.nativeEnum(ExtractionStatus).optional(),
  domain: z.string().max(253).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
