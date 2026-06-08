export const SYSTEM_MODE_REDIS_KEY = "system:mode";

export type SystemMode = "RUNNING" | "PAUSED";

export interface SystemModeStatus {
  mode: SystemMode;
  redisAvailable: boolean;
  failSafe: boolean;
}
