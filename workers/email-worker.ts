/**
 * SMART WORLD X — Email delivery worker
 *
 *   npm run email-worker
 *
 * Processes outbound email queue via SMTP.
 */
import { isQueueEnabled } from "../lib/queue/connection";
import { startEmailDbPoller, stopEmailDbPoller } from "../lib/delivery/db-poller";
import {
  startEmailRedisWorker,
  stopEmailRedisWorker,
} from "../lib/delivery/email-worker-runner";
import { isSmtpConfigured } from "../lib/delivery/smtp-client";

async function main() {
  if (!isSmtpConfigured()) {
    console.error(
      "[email-worker] SMTP not configured. Set SMTP_HOST and SMTP_FROM.",
    );
    process.exit(1);
  }

  const mode = isQueueEnabled() ? "redis" : "database";
  console.log(`[email-worker] Starting (mode=${mode})`);

  if (isQueueEnabled()) {
    startEmailRedisWorker();
  } else {
    console.warn("[email-worker] REDIS_URL not set — using database poller");
    startEmailDbPoller();
  }

  const shutdown = async (signal: string) => {
    console.log(`[email-worker] ${signal} received, shutting down…`);
    await stopEmailRedisWorker();
    stopEmailDbPoller();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[email-worker] Fatal:", err);
  process.exit(1);
});
