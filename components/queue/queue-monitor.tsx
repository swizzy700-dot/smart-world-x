"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cancelQueueJob,
  fetchQueueJobs,
  fetchQueueStats,
  reconcileQueue,
  retryQueueJob,
} from "@/lib/queue/client";
import type { JobListItem, QueueStats } from "@/lib/queue/types";
import type { SystemModeStatus } from "@/lib/system/types";
import { SystemModeToggle } from "@/components/system/system-mode-toggle";
import { JobTable } from "./job-table";
import { QueueStatsPanel } from "./queue-stats";

const JOB_FILTERS = [
  { value: "", label: "ALL JOBS" },
  { value: "PENDING", label: "PENDING" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "FAILED", label: "FAILED" },
  { value: "COMPLETED", label: "COMPLETED" },
] as const;

const POLL_MS = Number(process.env.NEXT_PUBLIC_QUEUE_DASHBOARD_POLL_MS ?? 15_000);

export function QueueMonitor() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemModeStatus | null>(
    null,
  );

  const readOnly =
    systemStatus?.mode === "PAUSED" || systemStatus?.failSafe === true;

  const refresh = useCallback(async () => {
    try {
      const [statsData, jobsData] = await Promise.all([
        fetchQueueStats(),
        fetchQueueJobs({
          status: statusFilter || undefined,
          domain: domainFilter || undefined,
          page,
        }),
      ]);
      setStats(statsData);
      setJobs(jobsData.jobs);
      setTotal(jobsData.total);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, domainFilter, page]);

  useEffect(() => {
    setLoading(true);
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!live) return;
    if (systemStatus?.mode !== "RUNNING") return;
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [live, refresh, systemStatus?.mode]);

  const handleRetry = async (jobId: string) => {
    if (readOnly) return;
    setActionLoading(jobId);
    setMessage(null);
    try {
      const result = await retryQueueJob(jobId);
      setMessage(
        `Job ${jobId.slice(0, 8)}… requeued${result.enqueued ? " (Redis)" : " (DB only)"}`,
      );
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (readOnly) return;
    if (!confirm("Cancel this job?")) return;
    setActionLoading(jobId);
    setMessage(null);
    try {
      await cancelQueueJob(jobId);
      setMessage(`Job ${jobId.slice(0, 8)}… cancelled`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconcile = async () => {
    if (readOnly) return;
    setMessage(null);
    try {
      const result = await reconcileQueue();
      setMessage(
        `Reconcile: ${result.enqueued} enqueued, ${result.skipped} skipped (${result.scanned} scanned)`,
      );
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reconcile failed");
    }
  };

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / QUEUE
          </p>
          <h1 className="font-mono text-2xl font-semibold text-cyan-50">
            QUEUE MONITOR
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SystemModeToggle onModeChange={setSystemStatus} />
          <label className="flex items-center gap-2 font-mono text-[10px] text-cyan-500">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="accent-cyan-500"
            />
            LIVE ({POLL_MS / 1000}s)
          </label>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded border border-cyan-800/60 px-3 py-1.5 font-mono text-[10px] text-cyan-300 hover:bg-cyan-950/40"
          >
            REFRESH
          </button>
          <button
            type="button"
            onClick={handleReconcile}
            disabled={readOnly}
            className="rounded border border-amber-800/60 px-3 py-1.5 font-mono text-[10px] text-amber-300 hover:bg-amber-950/30 disabled:opacity-40"
          >
            RECONCILE
          </button>
        </div>
      </header>

      {readOnly && (
        <p className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2 font-mono text-xs text-amber-200">
          System is paused — dashboard is read-only. Resume processing to retry,
          cancel, or reconcile jobs.
        </p>
      )}

      {message && (
        <p className="rounded border border-cyan-900/40 bg-[#0d1219] px-3 py-2 font-mono text-xs text-cyan-300">
          {message}
        </p>
      )}

      <QueueStatsPanel
        stats={stats}
        loading={loading && !stats}
        systemStatus={systemStatus ?? stats?.system ?? null}
      />

      <div className="flex flex-wrap gap-2">
        {JOB_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`rounded border px-2 py-1 font-mono text-[10px] ${
              statusFilter === f.value
                ? "border-cyan-500/60 bg-cyan-950/50 text-cyan-100"
                : "border-cyan-900/40 text-cyan-600 hover:text-cyan-400"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          value={domainFilter}
          onChange={(e) => {
            setDomainFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter domain…"
          className="ml-auto rounded border border-cyan-900/50 bg-[#0a0e14] px-2 py-1 font-mono text-xs text-cyan-200 focus:border-cyan-600 focus:outline-none"
        />
      </div>

      <JobTable
        jobs={jobs}
        onRetry={handleRetry}
        onCancel={handleCancel}
        actionLoading={actionLoading}
        readOnly={readOnly}
      />

      <div className="flex items-center justify-between font-mono text-[10px] text-cyan-600">
        <span>
          {total} job{total !== 1 ? "s" : ""} · page {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-cyan-900/40 px-2 py-1 disabled:opacity-40"
          >
            PREV
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-cyan-900/40 px-2 py-1 disabled:opacity-40"
          >
            NEXT
          </button>
        </div>
      </div>
    </div>
  );
}
