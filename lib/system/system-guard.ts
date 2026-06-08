import type { Job } from "bullmq";
import { SYSTEM_PAUSED_JOB_DELAY_MS } from "./constants";
import { isProcessingAllowed, isSystemPaused } from "./system-mode";

export class SystemPausedError extends Error {
  constructor(message = "System is paused — processing is disabled") {
    super(message);
    this.name = "SystemPausedError";
    this.code = "SYSTEM_PAUSED";
  }

  readonly code: string;
}

/** Throws when the system is paused (for API mutation guards). */
export async function assertSystemRunning(): Promise<void> {
  if (!(await isProcessingAllowed())) {
    throw new SystemPausedError();
  }
}

/** Returns false when enqueue to Redis should be skipped (DB records remain pending). */
export async function canEnqueueToRedis(): Promise<boolean> {
  return isProcessingAllowed();
}

/**
 * Secondary guard inside job handlers — defers work if pause raced with pickup.
 * Returns true when the job was deferred.
 */
export async function deferJobIfPaused(job: Job): Promise<boolean> {
  if (!(await isSystemPaused())) {
    return false;
  }

  try {
    const token = job.token;
    if (token) {
      await job.moveToDelayed(Date.now() + SYSTEM_PAUSED_JOB_DELAY_MS, token);
    } else {
      await job.moveToDelayed(Date.now() + SYSTEM_PAUSED_JOB_DELAY_MS);
    }
  } catch (error) {
    console.warn(
      `[system-guard] could not defer job ${job.id}:`,
      error instanceof Error ? error.message : error,
    );
  }

  return true;
}
