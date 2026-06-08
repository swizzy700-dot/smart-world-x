"use client";

import type { QueueStats } from "@/lib/queue/types";
import type { SystemModeStatus } from "@/lib/system/types";

interface QueueStatsPanelProps {
  stats: QueueStats | null;
  loading?: boolean;
  systemStatus?: SystemModeStatus | null;
}

export function QueueStatsPanel({
  stats,
  loading,
  systemStatus,
}: QueueStatsPanelProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded border border-cyan-900/30 bg-[#0d1219]"
          />
        ))}
      </div>
    );
  }

  const tiles = [
    { label: "QUEUED", value: stats.websites.QUEUED, color: "text-amber-300" },
    {
      label: "PROCESSING",
      value: stats.websites.PROCESSING,
      color: "text-cyan-300",
    },
    {
      label: "COMPLETED",
      value: stats.websites.COMPLETED,
      color: "text-emerald-300",
    },
    { label: "FAILED", value: stats.websites.FAILED, color: "text-red-300" },
    {
      label: "JOBS PENDING",
      value: stats.jobs.PENDING,
      color: "text-amber-200",
    },
    {
      label: "REDIS WAITING",
      value: stats.queue.waiting,
      color: "text-cyan-200",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded border border-cyan-900/40 bg-[#0d1219] px-3 py-2"
          >
            <p className="font-mono text-[10px] tracking-widest text-cyan-600">
              {tile.label}
            </p>
            <p className={`font-mono text-xl font-semibold tabular-nums ${tile.color}`}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-cyan-700">
        SYSTEM: {(systemStatus?.mode ?? stats.system.mode).toUpperCase()}
        {systemStatus?.failSafe || stats.system.failSafe ? " · FAIL-SAFE" : ""}
        {" · "}
        MODE: {stats.queue.mode.toUpperCase()}
        {stats.queue.statsSource
          ? ` · STATS: ${stats.queue.statsSource.toUpperCase()}`
          : ""}
        {" · "}
        WORKERS: {stats.workers.concurrency} · ACTIVE LOCKS:{" "}
        {stats.workers.activeLocks} · REDIS ACTIVE: {stats.queue.active} ·
        QUEUE PAUSED: {stats.queue.paused ? "YES" : "NO"}
      </p>
    </div>
  );
}
