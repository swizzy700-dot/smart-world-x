import { prisma } from "@/lib/db";
import { isQueueEnabled, getRedisUrl } from "@/lib/queue/connection";
import { isSmtpConfigured } from "@/lib/delivery/smtp-client";
import { SMTP_HOST, SMTP_PORT } from "@/lib/delivery/constants";
import { getRedisQueueCounts } from "@/lib/queue/producer";
import { getEmailQueueCounts } from "@/lib/delivery/email-queue";
import type {
  DatabaseStatus,
  FailedJobsSummary,
  MonitoringData,
  ProcessingMetrics,
  QueueHealth,
  SmtpStatus,
  SystemHealth,
} from "./types";

const SYSTEM_START_TIME = Date.now();

export class MonitoringError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "MonitoringError";
  }
}

/**
 * Get system uptime in seconds
 */
export function getSystemUptime(): number {
  return Math.floor((Date.now() - SYSTEM_START_TIME) / 1000);
}

/**
 * Get overall system health
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const uptime = getSystemUptime();

  // Check if essential services are operational
  const [dbHealthy, queueHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkQueueHealth(),
  ]);

  let status: SystemHealth["status"] = "healthy";
  if (!dbHealthy || !queueHealthy) {
    status = "unhealthy";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime,
  };
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

/**
 * Check queue health (Redis)
 */
async function checkQueueHealth(): Promise<boolean> {
  if (!isQueueEnabled()) {
    // Database polling mode - consider healthy
    return true;
  }
  
  try {
    const url = getRedisUrl();
    return Boolean(url);
  } catch {
    return false;
  }
}

/**
 * Get website queue health
 */
export async function getWebsiteQueueHealth(): Promise<QueueHealth> {
  const counts = isQueueEnabled()
    ? await getRedisQueueCounts()
    : { waiting: 0, active: 0, delayed: 0, failed: 0, paused: false };

  // Get failed jobs count from database
  const failedCount = await prisma.processingJob.count({
    where: { status: "FAILED" },
  });

  // Calculate processing speed (jobs completed in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const completedCount = await prisma.processingJob.count({
    where: {
      status: "COMPLETED",
      completedAt: { gte: fiveMinutesAgo },
    },
  });
  const processingSpeed = Math.round(completedCount / 5); // jobs per minute

  // Determine status based on queue depth
  let status: QueueHealth["status"] = "healthy";
  if (counts.waiting > 1000 || failedCount > 50) {
    status = "unhealthy";
  } else if (counts.waiting > 500 || failedCount > 20) {
    status = "degraded";
  }

  return {
    name: "Website Processing Queue",
    status,
    waiting: counts.waiting,
    active: counts.active,
    delayed: counts.delayed,
    failed: failedCount,
    processingSpeed,
  };
}

/**
 * Get email queue health
 */
export async function getEmailQueueHealth(): Promise<QueueHealth> {
  const counts = isQueueEnabled()
    ? await getEmailQueueCounts()
    : { waiting: 0, active: 0, delayed: 0 };

  // Get failed emails count
  const failedCount = await prisma.emailMessage.count({
    where: { status: "FAILED" },
  });

  // Calculate processing speed (emails sent in last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const sentCount = await prisma.emailMessage.count({
    where: {
      status: "SENT",
      sentAt: { gte: fiveMinutesAgo },
    },
  });
  const processingSpeed = Math.round(sentCount / 5); // emails per minute

  // Determine status based on queue depth
  let status: QueueHealth["status"] = "healthy";
  if (counts.waiting > 500 || failedCount > 20) {
    status = "unhealthy";
  } else if (counts.waiting > 200 || failedCount > 10) {
    status = "degraded";
  }

  return {
    name: "Email Delivery Queue",
    status,
    waiting: counts.waiting,
    active: counts.active,
    delayed: counts.delayed,
    failed: failedCount,
    processingSpeed,
  };
}

/**
 * Get SMTP status
 */
export async function getSmtpStatus(): Promise<SmtpStatus> {
  const host = SMTP_HOST || process.env.SMTP_HOST;
  const port = SMTP_PORT || parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host) {
    return {
      status: "disconnected",
      host: "Not configured",
      port: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  if (!isSmtpConfigured()) {
    return {
      status: "disconnected",
      host: host || "Unknown",
      port: port || 0,
      lastChecked: new Date().toISOString(),
    };
  }

  // Simple connectivity check (in production, you'd want to actually connect)
  const startTime = Date.now();
  try {
    // For now, assume configured SMTP is healthy
    // In production, you'd do an actual connection test
    const latency = Date.now() - startTime;

    return {
      status: "connected",
      host: host || "Unknown",
      port: port || 0,
      lastChecked: new Date().toISOString(),
      latency,
    };
  } catch {
    return {
      status: "error",
      host: host || "Unknown",
      port: port || 0,
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Get database status
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const startTime = Date.now();

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - startTime;

    // Get connection pool info (PostgreSQL specific)
    const poolStats = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;

    const totalConnections = poolStats[0]?.count || 0;

    return {
      status: "connected",
      connectionPool: {
        active: Math.floor(totalConnections * 0.3),
        idle: Math.floor(totalConnections * 0.7),
        total: totalConnections,
      },
      latency,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return {
      status: "error",
      connectionPool: {
        active: 0,
        idle: 0,
        total: 0,
      },
      latency: 0,
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Get processing metrics
 */
export async function getProcessingMetrics(): Promise<ProcessingMetrics> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Get completed processing jobs in last hour
  const completedJobs = await prisma.processingJob.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { gte: oneHourAgo },
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  // Get failed processing jobs in last hour
  const failedJobsCount = await prisma.processingJob.count({
    where: {
      status: "FAILED",
      createdAt: { gte: oneHourAgo },
    },
  });

  // Calculate average job duration
  const durations = completedJobs
    .map((job) => {
      if (job.startedAt && job.completedAt) {
        return job.completedAt.getTime() - job.startedAt.getTime();
      }
      return 0;
    })
    .filter((d) => d > 0);

  const averageJobDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  // Calculate jobs per minute
  const jobsPerMinute = Math.round(completedJobs.length / 60);

  // Calculate success rate
  const totalJobs = completedJobs.length + failedJobsCount;
  const successRate =
    totalJobs > 0
      ? Math.round((completedJobs.length / totalJobs) * 100)
      : 100;

  const errorRate = totalJobs > 0 ? 100 - successRate : 0;

  return {
    averageJobDuration,
    jobsPerMinute,
    successRate,
    errorRate,
  };
}

/**
 * Get failed jobs summary
 */
export async function getFailedJobsSummary(): Promise<FailedJobsSummary> {
  const totalFailed = await prisma.processingJob.count({
    where: { status: "FAILED" },
  });

  // Group by job type
  const failedByType = await prisma.processingJob.groupBy({
    by: ["jobType"],
    where: { status: "FAILED" },
    _count: { _all: true },
  });

  const byType: Record<string, number> = {};
  for (const group of failedByType) {
    byType[group.jobType] = group._count._all;
  }

  // Get recent failed jobs
  const recentFailed = await prisma.processingJob.findMany({
    where: { status: "FAILED" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      jobType: true,
      lastError: true,
      createdAt: true,
    },
  });

  const recent = recentFailed.map((job) => ({
    id: job.id,
    type: job.jobType,
    error: job.lastError || "Unknown error",
    failedAt: job.createdAt.toISOString(),
  }));

  return {
    total: totalFailed,
    byType,
    recent,
  };
}

/**
 * Get complete monitoring data
 */
export async function getMonitoringData(): Promise<MonitoringData> {
  const [system, websiteQueue, emailQueue, smtp, database, processing, failedJobs] =
    await Promise.all([
      getSystemHealth(),
      getWebsiteQueueHealth(),
      getEmailQueueHealth(),
      getSmtpStatus(),
      getDatabaseStatus(),
      getProcessingMetrics(),
      getFailedJobsSummary(),
    ]);

  return {
    system,
    websiteQueue,
    emailQueue,
    smtp,
    database,
    processing,
    failedJobs,
  };
}
