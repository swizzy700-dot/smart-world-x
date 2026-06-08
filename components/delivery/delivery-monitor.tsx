"use client";

import { useEffect, useState } from "react";
import { fetchDeliveryStats } from "@/lib/delivery/client";
import type { DeliveryStats } from "@/lib/delivery/types";
import { fetchSystemMode } from "@/lib/system/client";
import type { SystemMode } from "@/lib/system/types";

const POLL_MS = Number(process.env.NEXT_PUBLIC_DELIVERY_DASHBOARD_POLL_MS ?? 15_000);

export function DeliveryMonitor() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const data = await fetchDeliveryStats();
        setStats(data);
      } catch {
        setStats(null);
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

      await load();
      if (mode === "RUNNING") {
        interval = setInterval(() => {
          load().catch(() => {});
        }, POLL_MS);
      }
    };

    boot().catch(() => {});
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!stats) return null;

  const tiles = [
    { label: "PENDING", value: stats.pending, color: "text-amber-300" },
    { label: "SENDING", value: stats.sending, color: "text-cyan-300" },
    { label: "SENT", value: stats.sent, color: "text-emerald-300" },
    { label: "FAILED", value: stats.failed, color: "text-red-300" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded border border-violet-900/40 bg-[#0d1219] px-3 py-2"
          >
            <p className="font-mono text-[10px] text-violet-600">{t.label}</p>
            <p className={`font-mono text-xl font-semibold tabular-nums ${t.color}`}>
              {t.value}
            </p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-cyan-800">
        Queue ({stats.queue.mode}): {stats.queue.waiting} waiting ·{" "}
        {stats.queue.active} active
        {"delayed" in stats.queue && ` · ${stats.queue.delayed} delayed`}
      </p>
    </div>
  );
}
