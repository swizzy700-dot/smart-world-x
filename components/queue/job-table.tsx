"use client";

import Link from "next/link";
import type { JobListItem } from "@/lib/queue/types";

const statusColors: Record<string, string> = {
  PENDING: "text-amber-400",
  ACTIVE: "text-cyan-400",
  COMPLETED: "text-emerald-400",
  FAILED: "text-red-400",
  QUEUED: "text-amber-300",
  PROCESSING: "text-cyan-300",
  NEW: "text-zinc-400",
};

interface JobTableProps {
  jobs: JobListItem[];
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  actionLoading: string | null;
  readOnly?: boolean;
}

export function JobTable({
  jobs,
  onRetry,
  onCancel,
  actionLoading,
  readOnly = false,
}: JobTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded border border-dashed border-cyan-900/30 font-mono text-sm text-cyan-700">
        No jobs match filters
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded border border-cyan-900/40">
      <table className="w-full min-w-[800px] text-left font-mono text-xs">
        <thead className="sticky top-0 bg-[#0d1219] text-cyan-600">
          <tr>
            <th className="px-3 py-2 font-normal">DOMAIN</th>
            <th className="px-3 py-2 font-normal">JOB</th>
            <th className="px-3 py-2 font-normal">SITE</th>
            <th className="px-3 py-2 font-normal">STAGE</th>
            <th className="px-3 py-2 font-normal">ATTEMPTS</th>
            <th className="px-3 py-2 font-normal">WAIT</th>
            <th className="px-3 py-2 font-normal">BATCH</th>
            <th className="px-3 py-2 font-normal">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-t border-cyan-950/60 hover:bg-cyan-950/20"
            >
              <td className="px-3 py-2 text-cyan-100">{job.domain}</td>
              <td
                className={`px-3 py-2 ${statusColors[job.jobStatus] ?? "text-cyan-400"}`}
              >
                {job.jobStatus}
              </td>
              <td
                className={`px-3 py-2 ${statusColors[job.websiteStatus] ?? ""}`}
              >
                {job.websiteStatus}
              </td>
              <td className="px-3 py-2 text-cyan-500">
                {job.currentStage ?? "—"}
              </td>
              <td className="px-3 py-2 tabular-nums text-cyan-300">
                {job.attempts}/{job.maxAttempts}
              </td>
              <td className="px-3 py-2 tabular-nums text-cyan-600">
                {formatWait(job.waitMs)}
              </td>
              <td
                className="max-w-[100px] truncate px-3 py-2 text-cyan-700"
                title={job.batchCode}
              >
                {job.batchCode}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Link
                    href={`/analysis/${job.websiteId}`}
                    className="rounded border border-emerald-900/50 px-2 py-0.5 text-[10px] text-emerald-400 hover:bg-emerald-950/30"
                  >
                    ANALYSIS
                  </Link>
                  <Link
                    href={`/contacts/${job.websiteId}`}
                    className="rounded border border-cyan-900/50 px-2 py-0.5 text-[10px] text-cyan-400 hover:bg-cyan-950/30"
                  >
                    CONTACTS
                  </Link>
                  <Link
                    href={`/outreach/${job.websiteId}`}
                    className="rounded border border-violet-900/50 px-2 py-0.5 text-[10px] text-violet-400 hover:bg-violet-950/30"
                  >
                    OUTREACH
                  </Link>
                  {!readOnly &&
                    (job.jobStatus === "FAILED" ||
                      job.jobStatus === "PENDING") && (
                      <button
                        type="button"
                        disabled={actionLoading === job.id}
                        onClick={() => onRetry(job.id)}
                        className="rounded border border-cyan-800/60 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-950/50 disabled:opacity-40"
                      >
                        RETRY
                      </button>
                    )}
                  {!readOnly &&
                    job.jobStatus !== "COMPLETED" &&
                    job.jobStatus !== "ACTIVE" && (
                      <button
                        type="button"
                        disabled={actionLoading === job.id}
                        onClick={() => onCancel(job.id)}
                        className="rounded border border-red-900/50 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-950/30 disabled:opacity-40"
                      >
                        CANCEL
                      </button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatWait(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}
