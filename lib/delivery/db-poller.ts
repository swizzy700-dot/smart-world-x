import { EmailDeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EMAIL_POLL_INTERVAL_MS, EMAIL_WORKER_CONCURRENCY } from "./constants";
import { isSystemPaused } from "@/lib/system/system-mode";
import { executeEmailSend } from "./send-email";
import { isSmtpConfigured } from "./smtp-client";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let running = 0;

async function claimPending(): Promise<string[]> {
  const slots = EMAIL_WORKER_CONCURRENCY - running;
  if (slots <= 0) return [];

  const pending = await prisma.emailMessage.findMany({
    where: { status: EmailDeliveryStatus.PENDING },
    orderBy: { queuedAt: "asc" },
    take: slots,
    select: { id: true },
  });

  return pending.map((p) => p.id);
}

async function processOne(emailMessageId: string): Promise<void> {
  running += 1;
  try {
    if (!isSmtpConfigured()) return;
    await executeEmailSend(emailMessageId);
  } catch {
    // Status updated in executeEmailSend; retry on next poll if still PENDING
  } finally {
    running -= 1;
  }
}

async function pollOnce(): Promise<void> {
  if (await isSystemPaused()) return;

  const ids = await claimPending();
  await Promise.all(ids.map(processOne));
}

export function startEmailDbPoller(): void {
  if (pollTimer) return;

  console.log(
    `[email-worker] DB poller started (interval=${EMAIL_POLL_INTERVAL_MS}ms, concurrency=${EMAIL_WORKER_CONCURRENCY})`,
  );

  pollTimer = setInterval(() => {
    pollOnce().catch((err) => console.error("[email-worker] Poll error:", err));
  }, EMAIL_POLL_INTERVAL_MS);

  pollOnce().catch(console.error);
}

export function stopEmailDbPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
