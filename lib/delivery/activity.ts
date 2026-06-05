import type { EmailActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function logEmailActivity(
  emailMessageId: string,
  type: EmailActivityType,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return prisma.emailActivity.create({
    data: {
      emailMessageId,
      type,
      message,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
