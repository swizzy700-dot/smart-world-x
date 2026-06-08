import Redis from "ioredis";
import { getRedisUrl } from "@/lib/queue/connection";

let client: Redis | null = null;

export function getSystemRedis(): Redis | null {
  const url = getRedisUrl();
  if (!url) return null;

  if (!client) {
    client = new Redis(url, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      commandTimeout: 3_000,
      lazyConnect: true,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1_000)),
    });

    client.on("error", (err) => {
      console.warn("[system-redis] connection error:", err.message);
    });
  }

  return client;
}

export async function closeSystemRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => client?.disconnect());
    client = null;
  }
}
