import type { Queue } from "bullmq";
import { withRedisStatsCache } from "./redis-stats-cache";

export type QueueCountSnapshot = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  paused: boolean;
};

export type SimpleQueueCountSnapshot = {
  waiting: number;
  active: number;
  delayed: number;
};

async function readPipelineQueueCounts(
  queue: Queue,
): Promise<QueueCountSnapshot> {
  const [counts, paused] = await Promise.all([
    queue.getJobCounts("waiting", "active", "delayed", "failed"),
    queue.isPaused(),
  ]);

  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
    failed: counts.failed ?? 0,
    paused,
  };
}

async function readSimpleQueueCounts(
  queue: Queue,
): Promise<SimpleQueueCountSnapshot> {
  const counts = await queue.getJobCounts("waiting", "active", "delayed");

  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
  };
}

export function fetchPipelineQueueCounts(
  queue: Queue,
  cacheKey: string,
): Promise<QueueCountSnapshot> {
  return withRedisStatsCache(cacheKey, () => readPipelineQueueCounts(queue));
}

export function fetchSimpleQueueCounts(
  queue: Queue,
  cacheKey: string,
): Promise<SimpleQueueCountSnapshot> {
  return withRedisStatsCache(cacheKey, () => readSimpleQueueCounts(queue));
}
