"use client";

import { useEffect, useState } from "react";
import {
  fetchRecentBatches,
  type IntakeBatchSummary,
} from "@/lib/intake/client";

export function RecentBatches() {
  const [batches, setBatches] = useState<IntakeBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentBatches()
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-3">
      <p className="mb-2 font-mono text-[10px] tracking-widest text-cyan-600">
        RECENT BATCHES
      </p>
      {loading ? (
        <p className="font-mono text-xs text-cyan-700">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="font-mono text-xs text-cyan-700">No batches yet</p>
      ) : (
        <ul className="space-y-2">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="flex items-center justify-between gap-2 border-b border-cyan-950/50 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-cyan-200">
                  {batch.batchCode}
                </p>
                <p className="font-mono text-[10px] text-cyan-600">
                  {batch.insertedCount} inserted · {batch.duplicateCount} dup ·{" "}
                  {batch.invalidCount} invalid
                </p>
              </div>
              <time className="shrink-0 font-mono text-[10px] text-cyan-700">
                {formatRelative(batch.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
