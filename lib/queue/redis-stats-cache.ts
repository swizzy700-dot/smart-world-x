import { QUEUE_REDIS_STATS_CACHE_TTL_MS } from "./constants";

type CacheEntry<T> = { data: T; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Short-lived in-process cache for Redis queue count reads.
 * Safe across concurrent API requests in the same Node process.
 */
export async function withRedisStatsCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = QUEUE_REDIS_STATS_CACHE_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expiresAt: now + ttlMs });
  return data;
}
