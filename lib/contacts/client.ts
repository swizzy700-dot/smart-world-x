import type { ContactExtractionRecord } from "./types";

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

export async function fetchContacts(
  websiteId: string,
): Promise<ContactExtractionRecord> {
  const res = await fetch(`/api/contacts/${websiteId}`, { cache: "no-store" });
  return parseResponse<ContactExtractionRecord>(res);
}

export async function fetchContactExtractions(params?: {
  status?: string;
  domain?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.domain) search.set("domain", params.domain);
  if (params?.page) search.set("page", String(params.page));

  const res = await fetch(`/api/contacts?${search}`, { cache: "no-store" });
  return parseResponse(res);
}
