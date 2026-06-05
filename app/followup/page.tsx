"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ScheduleRow {
  id: string;
  websiteId: string;
  initialEmailId: string;
  sequence: number;
  scheduledDays: number;
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  cancelledAt: string | null;
  skippedReason: string | null;
  stoppedDueToReply: boolean;
  domain: string;
  normalizedUrl: string;
}

interface Stats {
  followUp: {
    total: number;
    pending: number;
    scheduled: number;
    sent: number;
    cancelled: number;
    skipped: number;
    stoppedDueToReply: number;
  };
  reply: {
    total: number;
    pending: number;
    received: number;
    failed: number;
  };
}

export default function FollowUpPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/followup").then((r) => r.json()),
      fetch("/api/followup/stats").then((r) => r.json()),
    ])
      .then(([schedulesRes, statsRes]) => {
        if (schedulesRes.success) setSchedules(schedulesRes.data.schedules);
        if (statsRes.success) setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    PENDING: "text-amber-400",
    SCHEDULED: "text-cyan-400",
    SENT: "text-emerald-400",
    CANCELLED: "text-red-400",
    SKIPPED: "text-violet-400",
  };

  return (
    <div className="min-h-screen bg-[#070b10] text-cyan-50">
      <nav className="border-b border-cyan-900/40 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm tracking-widest text-cyan-500 hover:text-cyan-300"
          >
            ◈ SMART WORLD X
          </Link>
          <span className="font-mono text-[10px] text-violet-500">FOLLOW-UP</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <header className="border-b border-cyan-900/40 pb-4">
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / FOLLOW-UP
          </p>
          <h1 className="font-mono text-2xl font-semibold text-cyan-50">
            FOLLOW-UP AUTOMATION
          </h1>
        </header>

        {stats && (
          <div className="grid grid-cols-2 gap-4 rounded border border-cyan-900/40 bg-[#0d1219] p-4">
            <div>
              <p className="font-mono text-[10px] text-cyan-600">FOLLOW-UPS</p>
              <div className="mt-2 space-y-1 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-400">Total</span>
                  <span className="text-cyan-200">{stats.followUp.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Scheduled</span>
                  <span className="text-cyan-200">{stats.followUp.scheduled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Sent</span>
                  <span className="text-cyan-200">{stats.followUp.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Stopped (Reply)</span>
                  <span className="text-violet-400">
                    {stats.followUp.stoppedDueToReply}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] text-cyan-600">REPLIES</p>
              <div className="mt-2 space-y-1 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-400">Total</span>
                  <span className="text-cyan-200">{stats.reply.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Received</span>
                  <span className="text-emerald-400">{stats.reply.received}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400">Pending</span>
                  <span className="text-amber-400">{stats.reply.pending}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="font-mono text-sm text-cyan-700">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="font-mono text-sm text-cyan-700">No follow-up schedules yet.</p>
        ) : (
          <div className="overflow-auto rounded border border-cyan-900/40">
            <table className="w-full font-mono text-xs">
              <thead className="bg-[#0d1219] text-cyan-600">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">SEQUENCE</th>
                  <th className="px-3 py-2 text-left font-normal">STATUS</th>
                  <th className="px-3 py-2 text-left font-normal">DOMAIN</th>
                  <th className="px-3 py-2 text-left font-normal">SCHEDULED FOR</th>
                  <th className="px-3 py-2 text-left font-normal">SENT AT</th>
                  <th className="px-3 py-2 text-left font-normal">STOPPED</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-cyan-950/60 hover:bg-cyan-950/20"
                  >
                    <td className="px-3 py-2 text-cyan-200">
                      Day {s.scheduledDays} (#{s.sequence})
                    </td>
                    <td className={`px-3 py-2 ${statusColor[s.status] ?? ""}`}>
                      {s.status}
                    </td>
                    <td className="px-3 py-2 text-cyan-200">{s.domain}</td>
                    <td className="px-3 py-2 text-cyan-400">
                      {s.scheduledFor
                        ? new Date(s.scheduledFor).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-cyan-500">
                      {s.sentAt ? new Date(s.sentAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {s.stoppedDueToReply && (
                        <span className="text-violet-400">Yes</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
          <p className="font-mono text-[10px] text-cyan-600">RULES</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-cyan-400">
            <li>• Day 3: Follow-Up #1</li>
            <li>• Day 7: Follow-Up #2</li>
            <li>• Day 14: Follow-Up #3</li>
            <li>• Stop follow-ups after a reply</li>
            <li>• Store follow-up history</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
