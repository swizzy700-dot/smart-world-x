import type { ConnectionOptions } from "bullmq";

export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL;
}

export function isQueueEnabled(): boolean {
  return Boolean(getRedisUrl());
}

export function getConnectionOptions(): ConnectionOptions {
  const url = getRedisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
  return {
    url,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
