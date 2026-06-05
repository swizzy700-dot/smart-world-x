import type { OutreachDraftRecord } from "./types";

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

export async function fetchOutreach(
  websiteId: string,
): Promise<OutreachDraftRecord> {
  const res = await fetch(`/api/outreach/${websiteId}`, { cache: "no-store" });
  return parseResponse<OutreachDraftRecord>(res);
}

export async function regenerateOutreach(
  websiteId: string,
): Promise<OutreachDraftRecord> {
  const res = await fetch(`/api/outreach/${websiteId}/generate`, {
    method: "POST",
  });
  return parseResponse<OutreachDraftRecord>(res);
}
