import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL;
}

export function isQueueEnabled(): boolean {
  return Boolean(getRedisUrl());
}

function redisUrl(): string {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
  return url;
}

/** Queue / producer connections (non-blocking). */
export function getQueueConnectionOptions(): ConnectionOptions {
  return {
    url: redisUrl(),
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };
}

/** Worker connections — must allow indefinite blocking commands (BRPOP). */
export function getWorkerConnectionOptions(): ConnectionOptions {
  return {
    url: redisUrl(),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  };
}

/** @deprecated Use getQueueConnectionOptions or getWorkerConnectionOptions. */
export function getConnectionOptions(): ConnectionOptions {
  return getQueueConnectionOptions();
}
