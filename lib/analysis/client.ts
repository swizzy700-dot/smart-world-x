import type { AnalysisListItem, AnalysisRecord } from "./types";

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

export async function fetchAnalysis(websiteId: string): Promise<AnalysisRecord> {
  const res = await fetch(`/api/analysis/${websiteId}`, { cache: "no-store" });
  return parseResponse<AnalysisRecord>(res);
}

export async function fetchAnalyses(params?: {
  status?: string;
  domain?: string;
  page?: number;
}): Promise<{
  analyses: AnalysisListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.domain) search.set("domain", params.domain);
  if (params?.page) search.set("page", String(params.page));

  const res = await fetch(`/api/analysis?${search}`, { cache: "no-store" });
  return parseResponse(res);
}
