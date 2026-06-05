import { z } from "zod";

export const intakePreviewSchema = z.object({
  input: z.string().min(1, "Paste at least one URL"),
});

export const intakeExecuteSchema = z.object({
  input: z.string().min(1, "Paste at least one URL"),
  autoQueue: z.boolean().optional().default(true),
  tags: z.array(z.string().max(64)).max(20).optional().default([]),
});

export type IntakePreviewBody = z.infer<typeof intakePreviewSchema>;
export type IntakeExecuteBody = z.infer<typeof intakeExecuteSchema>;
