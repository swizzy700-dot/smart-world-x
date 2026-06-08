import { SYSTEM_MODE_CACHE_MS } from "./constants";
import type { SystemMode, SystemModeStatus } from "./types";
import { SYSTEM_MODE_REDIS_KEY } from "./types";
import { closeSystemRedis, getSystemRedis } from "./system-redis";

let cachedMode: SystemMode | null = null;
let cacheExpiresAt = 0;
let lastRedisAvailable = true;

function normalizeMode(value: string | null | undefined): SystemMode {
  return value === "PAUSED" ? "PAUSED" : "RUNNING";
}

function readCache(): SystemMode | null {
  if (cachedMode && Date.now() < cacheExpiresAt) {
    return cachedMode;
  }
  return null;
}

function writeCache(mode: SystemMode): void {
  cachedMode = mode;
  cacheExpiresAt = Date.now() + SYSTEM_MODE_CACHE_MS;
}

/** Fail-safe: Redis errors imply PAUSED. */
export async function getSystemMode(): Promise<SystemMode> {
  const hit = readCache();
  if (hit) return hit;

  const redis = getSystemRedis();
  if (!redis) {
    lastRedisAvailable = false;
    writeCache("PAUSED");
    return "PAUSED";
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const value = await redis.get(SYSTEM_MODE_REDIS_KEY);
    const mode = normalizeMode(value);
    lastRedisAvailable = true;
    writeCache(mode);
    return mode;
  } catch (error) {
    console.warn(
      "[system-mode] read failed — fail-safe PAUSED:",
      error instanceof Error ? error.message : error,
    );
    lastRedisAvailable = false;
    writeCache("PAUSED");
    return "PAUSED";
  }
}

export async function getSystemModeStatus(): Promise<SystemModeStatus> {
  const mode = await getSystemMode();
  return {
    mode,
    redisAvailable: lastRedisAvailable,
    failSafe: !lastRedisAvailable || mode === "PAUSED",
  };
}

export async function isSystemPaused(): Promise<boolean> {
  return (await getSystemMode()) === "PAUSED";
}

export async function isProcessingAllowed(): Promise<boolean> {
  return !(await isSystemPaused());
}

export async function setSystemMode(mode: SystemMode): Promise<void> {
  const redis = getSystemRedis();
  if (!redis) {
    throw new SystemModeError(
      "Redis is not configured — cannot change system mode",
      "REDIS_UNAVAILABLE",
    );
  }

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.set(SYSTEM_MODE_REDIS_KEY, mode);
    invalidateSystemModeCache();
    writeCache(mode);
    lastRedisAvailable = true;
  } catch (error) {
    lastRedisAvailable = false;
    throw new SystemModeError(
      error instanceof Error ? error.message : "Failed to update system mode",
      "REDIS_WRITE_FAILED",
    );
  }
}

export async function pauseSystem(): Promise<SystemMode> {
  await setSystemMode("PAUSED");
  return "PAUSED";
}

export async function resumeSystem(): Promise<SystemMode> {
  await setSystemMode("RUNNING");
  return "RUNNING";
}

export function invalidateSystemModeCache(): void {
  cachedMode = null;
  cacheExpiresAt = 0;
}

/** In-process cache only — never touches Redis. */
export function peekCachedSystemMode(): SystemMode | null {
  return readCache();
}

export class SystemModeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SystemModeError";
  }
}

export { closeSystemRedis };
