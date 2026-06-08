/**
 * SMART WORLD X — Pipeline worker process
 *
 * Run alongside the Next.js app:
 *   npm run worker
 *
 * Uses Redis (BullMQ) when REDIS_URL is set, otherwise polls PostgreSQL.
 */
import { isQueueEnabled } from "../lib/queue/connection";
import { startDbPoller, stopDbPoller } from "../lib/queue/db-poller";
import { startRedisWorker, stopRedisWorker } from "../lib/queue/worker-runner";

async function main() {
  const mode = isQueueEnabled() ? "redis" : "database";

  console.log(`[worker] Starting pipeline worker (mode=${mode})`);

  if (isQueueEnabled()) {
    startRedisWorker();
  } else {
    console.warn(
      "[worker] REDIS_URL not set — using database poller. Set REDIS_URL for BullMQ.",
    );
    startDbPoller();
  }

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down…`);
    await stopRedisWorker();
    stopDbPoller();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[worker] Unhandled rejection:", reason, "at:", promise);
  });

  process.on("uncaughtException", (error) => {
    console.error("[worker] Uncaught exception:", error);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
