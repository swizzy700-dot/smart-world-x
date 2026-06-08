/** How often worker processes re-check system:mode (ms). */
export const SYSTEM_MODE_POLL_MS = Number(
  process.env.SYSTEM_MODE_POLL_MS ?? 30_000,
);

/** Local in-process cache TTL for system mode reads (ms). */
export const SYSTEM_MODE_CACHE_MS = Number(
  process.env.SYSTEM_MODE_CACHE_MS ?? 5_000,
);

/** Delay applied when a job is picked while the system is paused (ms). */
export const SYSTEM_PAUSED_JOB_DELAY_MS = Number(
  process.env.SYSTEM_PAUSED_JOB_DELAY_MS ?? 30_000,
);
