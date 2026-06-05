import type {
  JobListResult,
  QueueStats,
  ReconcileResult,
  RetryJobResult,
} from "./types";

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

export async function fetchQueueStats(): Promise<QueueStats> {
  const res = await fetch("/api/queue/stats", { cache: "no-store" });
  return parseResponse<QueueStats>(res);
}

export async function fetchQueueJobs(params?: {
  status?: string;
  websiteStatus?: string;
  domain?: string;
  page?: number;
}): Promise<JobListResult> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.websiteStatus) search.set("websiteStatus", params.websiteStatus);
  if (params?.domain) search.set("domain", params.domain);
  if (params?.page) search.set("page", String(params.page));

  const res = await fetch(`/api/queue/jobs?${search}`, { cache: "no-store" });
  return parseResponse<JobListResult>(res);
}

export async function retryQueueJob(jobId: string): Promise<RetryJobResult> {
  const res = await fetch(`/api/queue/jobs/${jobId}/retry`, {
    method: "POST",
  });
  return parseResponse<RetryJobResult>(res);
}

export async function cancelQueueJob(
  jobId: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`/api/queue/jobs/${jobId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await parseResponse<{ cancelled: boolean }>(res);
}

export async function reconcileQueue(): Promise<ReconcileResult> {
  const res = await fetch("/api/queue/reconcile", { method: "POST" });
  return parseResponse<ReconcileResult>(res);
}
