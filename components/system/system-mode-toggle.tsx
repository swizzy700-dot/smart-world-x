"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSystemMode,
  pauseSystem,
  resumeSystem,
} from "@/lib/system/client";
import type { SystemModeStatus } from "@/lib/system/types";

interface SystemModeToggleProps {
  onModeChange?: (status: SystemModeStatus) => void;
  compact?: boolean;
}

export function SystemModeToggle({
  onModeChange,
  compact = false,
}: SystemModeToggleProps) {
  const [status, setStatus] = useState<SystemModeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSystemMode();
      setStatus(next);
      onModeChange?.(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system mode");
    } finally {
      setLoading(false);
    }
  }, [onModeChange]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (status?.mode !== "RUNNING") return;
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, [refresh, status?.mode]);

  const handlePause = async () => {
    setActing(true);
    setError(null);
    try {
      const next = await pauseSystem();
      setStatus(next);
      onModeChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pause failed");
    } finally {
      setActing(false);
    }
  };

  const handleResume = async () => {
    setActing(true);
    setError(null);
    try {
      const next = await resumeSystem();
      setStatus(next);
      onModeChange?.(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setActing(false);
    }
  };

  const paused = status?.mode === "PAUSED";
  const failSafe = status?.failSafe ?? false;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-2 py-1 font-mono text-[10px] ${
            paused
              ? "border-amber-500/50 bg-amber-950/40 text-amber-200"
              : "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
          }`}
        >
          {loading ? "SYSTEM …" : `SYSTEM ${status?.mode ?? "PAUSED"}`}
          {failSafe && !loading ? " · FAIL-SAFE" : ""}
        </span>
        {!compact && (
          <button
            type="button"
            disabled={acting || loading || paused}
            onClick={handlePause}
            className="rounded border border-amber-700/50 px-3 py-1.5 font-mono text-[10px] text-amber-200 hover:bg-amber-950/40 disabled:opacity-40"
          >
            PAUSE SYSTEM
          </button>
        )}
        {!compact && (
          <button
            type="button"
            disabled={acting || loading || !paused}
            onClick={handleResume}
            className="rounded border border-emerald-700/50 px-3 py-1.5 font-mono text-[10px] text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-40"
          >
            RESUME SYSTEM
          </button>
        )}
        {compact && (
          <button
            type="button"
            disabled={acting || loading}
            onClick={paused ? handleResume : handlePause}
            className={`rounded border px-3 py-1.5 font-mono text-[10px] disabled:opacity-40 ${
              paused
                ? "border-emerald-700/50 text-emerald-200 hover:bg-emerald-950/40"
                : "border-amber-700/50 text-amber-200 hover:bg-amber-950/40"
            }`}
          >
            {paused ? "RESUME SYSTEM" : "PAUSE SYSTEM"}
          </button>
        )}
      </div>
      {error && (
        <p className="font-mono text-[10px] text-red-400">{error}</p>
      )}
    </div>
  );
}
