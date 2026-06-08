import type { SimpleQueueCountSnapshot } from "@/lib/queue/queue-counts";
import type { QueueCountSnapshot } from "@/lib/queue/queue-counts";

const EMPTY_PIPELINE: QueueCountSnapshot = {
  waiting: 0,
  active: 0,
  delayed: 0,
  failed: 0,
  paused: false,
};

const EMPTY_SIMPLE: SimpleQueueCountSnapshot = {
  waiting: 0,
  active: 0,
  delayed: 0,
};

let lastPipelineCounts: QueueCountSnapshot = { ...EMPTY_PIPELINE };
let lastEmailCounts: SimpleQueueCountSnapshot = { ...EMPTY_SIMPLE };

export function rememberPipelineCounts(counts: QueueCountSnapshot): void {
  lastPipelineCounts = { ...counts };
}

export function rememberEmailCounts(counts: SimpleQueueCountSnapshot): void {
  lastEmailCounts = { ...counts };
}

export function getLastPipelineCounts(): QueueCountSnapshot {
  return { ...lastPipelineCounts };
}

export function getLastEmailCounts(): SimpleQueueCountSnapshot {
  return { ...lastEmailCounts };
}

export function dbDerivedPipelineCounts(pendingJobs: number, activeJobs: number) {
  return {
    waiting: pendingJobs,
    active: activeJobs,
    delayed: 0,
    failed: lastPipelineCounts.failed,
    paused: lastPipelineCounts.paused,
  };
}

export function dbDerivedEmailCounts(pending: number, sending: number) {
  return {
    waiting: pending,
    active: sending,
    delayed: lastEmailCounts.delayed,
  };
}
