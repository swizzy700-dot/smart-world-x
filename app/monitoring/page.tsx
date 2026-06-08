"use client";

import { SystemModeToggle } from "@/components/system/system-mode-toggle";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSystemMode } from "@/lib/system/client";
import type { SystemMode } from "@/lib/system/types";

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
}

interface QueueHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  processingSpeed: number;
}

interface SmtpStatus {
  status: "connected" | "disconnected" | "error";
  host: string;
  port: number;
  lastChecked: string;
  latency?: number;
}

interface DatabaseStatus {
  status: "connected" | "disconnected" | "error";
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  latency: number;
  lastChecked: string;
}

interface ProcessingMetrics {
  averageJobDuration: number;
  jobsPerMinute: number;
  successRate: number;
  errorRate: number;
}

interface FailedJobsSummary {
  total: number;
  byType: Record<string, number>;
  recent: Array<{
    id: string;
    type: string;
    error: string;
    failedAt: string;
  }>;
}

interface MonitoringData {
  system: SystemHealth;
  websiteQueue: QueueHealth;
  emailQueue: QueueHealth;
  smtp: SmtpStatus;
  database: DatabaseStatus;
  processing: ProcessingMetrics;
  failedJobs: FailedJobsSummary;
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const fetchData = async () => {
      try {
        const response = await fetch("/api/monitoring");
        const body = await response.json();
        if (body.success) {
          setData(body.data);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error("Failed to fetch monitoring data:", error);
      } finally {
        setLoading(false);
      }
    };

    const boot = async () => {
      let mode: SystemMode = "PAUSED";
      try {
        const status = await fetchSystemMode();
        mode = status.mode;
      } catch {
        mode = "PAUSED";
      }

      await fetchData();
      if (mode === "RUNNING") {
        interval = setInterval(fetchData, 60_000);
      }
    };

    boot().catch(() => setLoading(false));
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
        return "text-emerald-400";
      case "degraded":
        return "text-amber-400";
      case "unhealthy":
      case "error":
      case "disconnected":
        return "text-red-400";
      default:
        return "text-cyan-400";
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
        return "bg-emerald-400/10 border-emerald-400/30";
      case "degraded":
        return "bg-amber-400/10 border-amber-400/30";
      case "unhealthy":
      case "error":
      case "disconnected":
        return "bg-red-400/10 border-red-400/30";
      default:
        return "bg-cyan-400/10 border-cyan-400/30";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm tracking-widest text-cyan-500 hover:text-cyan-300"
          >
            ◈ SMART WORLD X
          </Link>
          <span className="font-mono text-[10px] text-violet-500">
            MONITORING CENTER
          </span>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <header className="border-b border-cyan-900/40 pb-4">
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / MONITORING
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-mono text-2xl font-semibold text-cyan-50">
              SYSTEM MONITORING
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <SystemModeToggle compact />
              {lastUpdated && (
                <p className="font-mono text-xs text-cyan-600">
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
          </div>
        </header>

        {loading ? (
          <p className="font-mono text-sm text-cyan-700">Loading monitoring data…</p>
        ) : data ? (
          <div className="space-y-6">
            {/* System Health Widget */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">SYSTEM HEALTH</p>
              <div className="mt-3 grid grid-cols-2 gap-4 font-mono text-sm">
                <div>
                  <span className="text-cyan-400">Status: </span>
                  <span className={statusColor(data.system.status)}>
                    {data.system.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-cyan-400">Uptime: </span>
                  <span className="text-cyan-200">{formatUptime(data.system.uptime)}</span>
                </div>
              </div>
            </div>

            {/* Queue Health Widgets */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                className={`rounded border ${statusBg(data.websiteQueue.status)} bg-[#0d1219] p-4`}
              >
                <p className="font-mono text-[10px] text-cyan-600">
                  {data.websiteQueue.name}
                </p>
                <div className="mt-3 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Status:</span>
                    <span className={statusColor(data.websiteQueue.status)}>
                      {data.websiteQueue.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Waiting:</span>
                    <span className="text-cyan-200">{data.websiteQueue.waiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Active:</span>
                    <span className="text-cyan-200">{data.websiteQueue.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Failed:</span>
                    <span className="text-cyan-200">{data.websiteQueue.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Speed:</span>
                    <span className="text-cyan-200">{data.websiteQueue.processingSpeed} jobs/min</span>
                  </div>
                </div>
              </div>

              <div
                className={`rounded border ${statusBg(data.emailQueue.status)} bg-[#0d1219] p-4`}
              >
                <p className="font-mono text-[10px] text-cyan-600">
                  {data.emailQueue.name}
                </p>
                <div className="mt-3 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Status:</span>
                    <span className={statusColor(data.emailQueue.status)}>
                      {data.emailQueue.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Waiting:</span>
                    <span className="text-cyan-200">{data.emailQueue.waiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Active:</span>
                    <span className="text-cyan-200">{data.emailQueue.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Failed:</span>
                    <span className="text-cyan-200">{data.emailQueue.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Speed:</span>
                    <span className="text-cyan-200">{data.emailQueue.processingSpeed} emails/min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SMTP and Database Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                className={`rounded border ${statusBg(data.smtp.status)} bg-[#0d1219] p-4`}
              >
                <p className="font-mono text-[10px] text-cyan-600">SMTP STATUS</p>
                <div className="mt-3 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Status:</span>
                    <span className={statusColor(data.smtp.status)}>
                      {data.smtp.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Host:</span>
                    <span className="text-cyan-200">{data.smtp.host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Port:</span>
                    <span className="text-cyan-200">{data.smtp.port}</span>
                  </div>
                  {data.smtp.latency && (
                    <div className="flex justify-between">
                      <span className="text-cyan-400">Latency:</span>
                      <span className="text-cyan-200">{data.smtp.latency}ms</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`rounded border ${statusBg(data.database.status)} bg-[#0d1219] p-4`}
              >
                <p className="font-mono text-[10px] text-cyan-600">DATABASE STATUS</p>
                <div className="mt-3 space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Status:</span>
                    <span className={statusColor(data.database.status)}>
                      {data.database.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Connections:</span>
                    <span className="text-cyan-200">
                      {data.database.connectionPool.active}/
                      {data.database.connectionPool.total}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-400">Latency:</span>
                    <span className="text-cyan-200">{data.database.latency}ms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Metrics */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">PROCESSING METRICS</p>
              <div className="mt-3 grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-4">
                <div>
                  <span className="text-cyan-400">Avg Duration:</span>
                  <div className="text-cyan-200">{data.processing.averageJobDuration}ms</div>
                </div>
                <div>
                  <span className="text-cyan-400">Jobs/Min:</span>
                  <div className="text-cyan-200">{data.processing.jobsPerMinute}</div>
                </div>
                <div>
                  <span className="text-cyan-400">Success Rate:</span>
                  <div className="text-emerald-400">{data.processing.successRate}%</div>
                </div>
                <div>
                  <span className="text-cyan-400">Error Rate:</span>
                  <div className={data.processing.errorRate > 5 ? "text-red-400" : "text-cyan-200"}>
                    {data.processing.errorRate}%
                  </div>
                </div>
              </div>
            </div>

            {/* Failed Jobs */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">FAILED JOBS</p>
              <div className="mt-3 space-y-4 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-400">Total Failed:</span>
                  <span className="text-cyan-200">{data.failedJobs.total}</span>
                </div>

                {Object.keys(data.failedJobs.byType).length > 0 && (
                  <div>
                    <span className="text-cyan-400">By Type:</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(data.failedJobs.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-xs">
                          <span className="text-cyan-500">{type}</span>
                          <span className="text-cyan-300">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.failedJobs.recent.length > 0 && (
                  <div>
                    <span className="text-cyan-400">Recent Failures:</span>
                    <div className="mt-2 max-h-32 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="text-cyan-600">
                          <tr>
                            <th className="text-left py-1">Type</th>
                            <th className="text-left py-1">Error</th>
                            <th className="text-right py-1">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.failedJobs.recent.map((job) => (
                            <tr key={job.id} className="border-t border-cyan-950/60">
                              <td className="py-1 text-cyan-400">{job.type}</td>
                              <td className="py-1 text-cyan-500 max-w-[200px] truncate">
                                {job.error}
                              </td>
                              <td className="py-1 text-right text-cyan-600">
                                {new Date(job.failedAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm text-cyan-700">No monitoring data available.</p>
        )}
      </main>
    </div>
  );
}
