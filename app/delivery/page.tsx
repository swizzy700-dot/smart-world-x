"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeliveryMonitor } from "@/components/delivery/delivery-monitor";

interface MessageRow {
  id: string;
  websiteId: string;
  domain: string;
  status: string;
  toAddress: string;
  subject: string;
  attempts: number;
  queuedAt: string;
  sentAt: string | null;
}

export default function DeliveryPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/delivery")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setMessages(body.data.messages);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    PENDING: "text-amber-400",
    SENDING: "text-cyan-400",
    SENT: "text-emerald-400",
    FAILED: "text-red-400",
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
          <span className="font-mono text-[10px] text-violet-500">DELIVERY</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <header className="border-b border-cyan-900/40 pb-4">
          <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
            OPS / DELIVERY
          </p>
          <h1 className="font-mono text-2xl font-semibold text-cyan-50">
            EMAIL DELIVERY
          </h1>
        </header>

        <DeliveryMonitor />

        {loading ? (
          <p className="font-mono text-sm text-cyan-700">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="font-mono text-sm text-cyan-700">No outbound emails yet.</p>
        ) : (
          <div className="overflow-auto rounded border border-cyan-900/40">
            <table className="w-full font-mono text-xs">
              <thead className="bg-[#0d1219] text-cyan-600">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">STATUS</th>
                  <th className="px-3 py-2 text-left font-normal">DOMAIN</th>
                  <th className="px-3 py-2 text-left font-normal">TO</th>
                  <th className="px-3 py-2 text-left font-normal">SUBJECT</th>
                  <th className="px-3 py-2 text-left font-normal">ATTEMPTS</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr
                    key={m.id}
                    className="border-t border-cyan-950/60 hover:bg-cyan-950/20"
                  >
                    <td className={`px-3 py-2 ${statusColor[m.status] ?? ""}`}>
                      {m.status}
                    </td>
                    <td className="px-3 py-2 text-cyan-200">{m.domain}</td>
                    <td className="px-3 py-2 text-cyan-400">{m.toAddress}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-cyan-500">
                      {m.subject}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-cyan-600">
                      {m.attempts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
