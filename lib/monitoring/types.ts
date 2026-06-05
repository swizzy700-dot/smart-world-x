export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
}

export interface QueueHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  processingSpeed: number; // jobs per minute
}

export interface SmtpStatus {
  status: "connected" | "disconnected" | "error";
  host: string;
  port: number;
  lastChecked: string;
  latency?: number;
}

export interface DatabaseStatus {
  status: "connected" | "disconnected" | "error";
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  latency: number;
  lastChecked: string;
}

export interface ProcessingMetrics {
  averageJobDuration: number; // in milliseconds
  jobsPerMinute: number;
  successRate: number; // percentage
  errorRate: number; // percentage
}

export interface FailedJobsSummary {
  total: number;
  byType: Record<string, number>;
  recent: Array<{
    id: string;
    type: string;
    error: string;
    failedAt: string;
  }>;
}

export interface MonitoringData {
  system: SystemHealth;
  websiteQueue: QueueHealth;
  emailQueue: QueueHealth;
  smtp: SmtpStatus;
  database: DatabaseStatus;
  processing: ProcessingMetrics;
  failedJobs: FailedJobsSummary;
}
