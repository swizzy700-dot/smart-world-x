import type { IntakeExecuteResult, IntakePreviewResult } from "./types";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: { message: string; code: string; details?: unknown };
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.error?.message ?? "Request failed");
  }
  return body.data;
}

export async function previewIntakeClient(
  input: string,
): Promise<IntakePreviewResult> {
  const res = await fetch("/api/intake/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  return parseResponse<IntakePreviewResult>(res);
}

export async function executeIntakeClient(
  input: string,
  options?: { autoQueue?: boolean; tags?: string[] },
): Promise<IntakeExecuteResult> {
  const res = await fetch("/api/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      autoQueue: options?.autoQueue ?? true,
      tags: options?.tags ?? [],
    }),
  });
  return parseResponse<IntakeExecuteResult>(res);
}

export interface IntakeBatchSummary {
  id: string;
  batchCode: string;
  totalLines: number;
  validCount: number;
  insertedCount: number;
  duplicateCount: number;
  invalidCount: number;
  createdAt: string;
}

export async function fetchRecentBatches(): Promise<IntakeBatchSummary[]> {
  const res = await fetch("/api/intake/batches?limit=8");
  const data = await parseResponse<{ batches: IntakeBatchSummary[] }>(res);
  return data.batches;
}
