import type {
  ProcessingJobStatus,
  WebsiteStatus,
} from "@prisma/client";

export interface PipelineJobPayload {
  websiteId: string;
  jobId: string;
  normalizedUrl: string;
  domain: string;
}

export interface QueueStats {
  websites: Record<WebsiteStatus, number>;
  jobs: Record<ProcessingJobStatus, number>;
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    paused: boolean;
    mode: "redis" | "database";
    statsSource?: "redis" | "snapshot" | "database";
  };
  workers: {
    concurrency: number;
    activeLocks: number;
  };
  system: {
    mode: "RUNNING" | "PAUSED";
    redisAvailable: boolean;
    failSafe: boolean;
  };
}

export interface JobListItem {
  id: string;
  websiteId: string;
  domain: string;
  normalizedUrl: string;
  websiteStatus: WebsiteStatus;
  jobStatus: ProcessingJobStatus;
  currentStage: string | null;
  attempts: number;
  maxAttempts: number;
  priority: number;
  lastError: string | null;
  batchCode: string;
  waitMs: number;
  createdAt: string;
  startedAt: string | null;
  scheduledAt: string | null;
}

export interface JobListResult {
  jobs: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RetryJobResult {
  jobId: string;
  websiteId: string;
  enqueued: boolean;
}

export interface ReconcileResult {
  scanned: number;
  enqueued: number;
  skipped: number;
}
