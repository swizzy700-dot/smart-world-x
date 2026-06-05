import type { DeliveryStats, EmailMessageRecord } from "./types";

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

export async function queueEmailSend(params: {
  websiteId: string;
  outreachDraftId?: string;
  toAddress?: string;
}): Promise<EmailMessageRecord> {
  const res = await fetch("/api/delivery/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseResponse<EmailMessageRecord>(res);
}

export async function fetchWebsiteEmails(
  websiteId: string,
): Promise<EmailMessageRecord[]> {
  const res = await fetch(`/api/delivery/website/${websiteId}`, {
    cache: "no-store",
  });
  return parseResponse<EmailMessageRecord[]>(res);
}

export async function fetchDeliveryStats(): Promise<DeliveryStats> {
  const res = await fetch("/api/delivery/stats", { cache: "no-store" });
  return parseResponse<DeliveryStats>(res);
}

export async function retryEmail(messageId: string): Promise<EmailMessageRecord> {
  const res = await fetch(`/api/delivery/messages/${messageId}/retry`, {
    method: "POST",
  });
  return parseResponse<EmailMessageRecord>(res);
}
