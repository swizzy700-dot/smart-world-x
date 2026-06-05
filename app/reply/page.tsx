"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface LeadStatusStats {
  NEW: number;
  CONTACTED: number;
  REPLIED: number;
  ENGAGED: number;
  CONVERTED: number;
}

interface ConversationStats {
  total: number;
  outbound: number;
  inbound: number;
}

interface MonitoringConfig {
  enabled: boolean;
  config: {
    imapHost: string;
    imapPort: number;
    imapUser: string;
    pollIntervalMinutes: number;
  } | null;
}

export default function ReplyPage() {
  const [stats, setStats] = useState<{
    leadStatus: LeadStatusStats;
    conversation: ConversationStats;
    monitoring: MonitoringConfig;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reply?action=stats")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setStats(body.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const leadStatusColor: Record<string, string> = {
    NEW: "text-slate-400",
    CONTACTED: "text-cyan-400",
    REPLIED: "text-emerald-400",
    ENGAGED: "text-violet-400",
    CONVERTED: "text-amber-400",
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
          <span className="font-mono text-[10px] text-violet-500">REPLY</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <header className="border-b border-cyan-900/40 pb-4">
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / REPLY TRACKING
          </p>
          <h1 className="font-mono text-2xl font-semibold text-cyan-50">
            REPLY MONITORING
          </h1>
        </header>

        {loading ? (
          <p className="font-mono text-sm text-cyan-700">Loading…</p>
        ) : stats ? (
          <div className="space-y-6">
            {/* Lead Status Stats */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">LEAD STATUS</p>
              <div className="mt-2 grid grid-cols-5 gap-2 font-mono text-sm">
                {Object.entries(stats.leadStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className={`text-2xl ${leadStatusColor[status] ?? ""}`}>
                      {count}
                    </div>
                    <div className="text-[10px] text-cyan-500">{status}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Stats */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">CONVERSATIONS</p>
              <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-sm">
                <div className="text-center">
                  <div className="text-2xl text-cyan-200">{stats.conversation.total}</div>
                  <div className="text-[10px] text-cyan-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-cyan-400">{stats.conversation.outbound}</div>
                  <div className="text-[10px] text-cyan-500">Outbound</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-emerald-400">{stats.conversation.inbound}</div>
                  <div className="text-[10px] text-cyan-500">Inbound</div>
                </div>
              </div>
            </div>

            {/* Monitoring Status */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">MONITORING STATUS</p>
              <div className="mt-2 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">Status:</span>
                  <span
                    className={
                      stats.monitoring.enabled ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {stats.monitoring.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                {stats.monitoring.config && (
                  <>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-cyan-400">IMAP Host:</span>
                      <span className="text-cyan-200">{stats.monitoring.config.imapHost}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-cyan-400">IMAP Port:</span>
                      <span className="text-cyan-200">{stats.monitoring.config.imapPort}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-cyan-400">User:</span>
                      <span className="text-cyan-200">{stats.monitoring.config.imapUser}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-cyan-400">Poll Interval:</span>
                      <span className="text-cyan-200">
                        {stats.monitoring.config.pollIntervalMinutes} minutes
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="rounded border border-cyan-900/40 bg-[#0d1219] p-4">
              <p className="font-mono text-[10px] text-cyan-600">FEATURES</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-cyan-400">
                <li>• Inbox monitoring (IMAP/POP3)</li>
                <li>• Reply detection (Message-ID, subject, email matching)</li>
                <li>• Lead status updates (NEW → CONTACTED → REPLIED → ENGAGED)</li>
                <li>• Conversation history storage</li>
                <li>• Automatic follow-up cancellation on reply</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm text-cyan-700">No stats available.</p>
        )}
      </main>
    </div>
  );
}
