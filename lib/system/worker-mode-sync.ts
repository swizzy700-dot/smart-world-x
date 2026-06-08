import type { Worker } from "bullmq";
import { SYSTEM_MODE_POLL_MS } from "./constants";
import { isSystemPaused } from "./system-mode";

const registeredWorkers = new Set<Worker>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastAppliedPaused: boolean | null = null;

export function registerWorkerForModeSync(worker: Worker): void {
  registeredWorkers.add(worker);
}

export function unregisterWorkerForModeSync(worker: Worker): void {
  registeredWorkers.delete(worker);
  if (registeredWorkers.size === 0) {
    stopWorkerModeSync();
  }
}

export async function syncWorkersToSystemMode(): Promise<void> {
  if (registeredWorkers.size === 0) return;

  const paused = await isSystemPaused();
  if (paused === lastAppliedPaused) return;

  for (const worker of registeredWorkers) {
    try {
      if (paused) {
        if (!worker.isPaused()) {
          await worker.pause();
          console.log(`[system-mode] worker paused (${worker.name || "unnamed"})`);
        }
      } else if (worker.isPaused()) {
        await worker.resume();
        console.log(`[system-mode] worker resumed (${worker.name || "unnamed"})`);
      }
    } catch (error) {
      console.warn(
        "[system-mode] worker pause/resume failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  lastAppliedPaused = paused;
}

export function startWorkerModeSync(): void {
  if (pollTimer) return;

  syncWorkersToSystemMode().catch((err) => {
    console.warn("[system-mode] initial sync failed:", err);
  });

  pollTimer = setInterval(() => {
    syncWorkersToSystemMode().catch((err) => {
      console.warn("[system-mode] sync failed:", err);
    });
  }, SYSTEM_MODE_POLL_MS);
}

export function stopWorkerModeSync(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  lastAppliedPaused = null;
}
