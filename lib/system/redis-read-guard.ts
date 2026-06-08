import { isQueueEnabled } from "@/lib/queue/connection";
import type { SystemModeStatus } from "./types";
import { peekCachedSystemMode } from "./system-mode";

const MAX_LIMIT_BACKOFF_MS = 5 * 60 * 1000;
const GENERIC_BACKOFF_MS = 60 * 1000;

let redisReadDegraded = false;
let degradedUntil = 0;

export function isMaxRequestsLimitError(error: unknown): boolean {
  const text = (error instanceof Error ? error.message : String(error ?? ""))
    .toLowerCase();
  return (
    text.includes("max requests limit") ||
    text.includes("max_requests_limit") ||
    text.includes("err max requests")
  );
}

/** Record a Redis read failure — blocks further dashboard Redis reads for a backoff window. */
export function markRedisReadDegraded(error?: unknown): void {
  redisReadDegraded = true;
  const backoff = error && isMaxRequestsLimitError(error)
    ? MAX_LIMIT_BACKOFF_MS
    : GENERIC_BACKOFF_MS;
  degradedUntil = Date.now() + backoff;
}

export function clearRedisReadDegraded(): void {
  redisReadDegraded = false;
  degradedUntil = 0;
}

export function isRedisReadDegraded(): boolean {
  if (!redisReadDegraded) return false;
  if (Date.now() >= degradedUntil) {
    redisReadDegraded = false;
    return false;
  }
  return true;
}

/**
 * Returns false when dashboard/monitoring must not touch Redis at all.
 * Uses in-process mode cache only — never issues a Redis command.
 */
export async function canUseRedisRead(): Promise<boolean> {
  if (!isQueueEnabled()) return false;
  if (isRedisReadDegraded()) return false;

  const cachedMode = peekCachedSystemMode();
  if (cachedMode === "PAUSED") return false;
  if (cachedMode === "RUNNING") return true;

  // No cached mode yet — fail-safe: do not probe Redis from read paths.
  return false;
}

/** System mode status for read-only API paths without hitting Redis. */
export function getSystemModeStatusForReads(): SystemModeStatus {
  const cachedMode = peekCachedSystemMode();
  const degraded = isRedisReadDegraded();
  const mode = cachedMode ?? "PAUSED";

  return {
    mode,
    redisAvailable: !degraded && cachedMode === "RUNNING",
    failSafe: degraded || mode === "PAUSED" || cachedMode === null,
  };
}
