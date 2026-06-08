import type { SystemModeStatus } from "./types";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { message: string; code: string };
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body.data;
}

export async function fetchSystemMode(): Promise<SystemModeStatus> {
  const res = await fetch("/api/system/mode", { cache: "no-store" });
  return parseResponse<SystemModeStatus>(res);
}

export async function pauseSystem(): Promise<SystemModeStatus> {
  const res = await fetch("/api/system/pause", { method: "POST" });
  return parseResponse<SystemModeStatus>(res);
}

export async function resumeSystem(): Promise<SystemModeStatus> {
  const res = await fetch("/api/system/resume", { method: "POST" });
  return parseResponse<SystemModeStatus>(res);
}
