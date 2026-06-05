"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAnalyses } from "@/lib/analysis/client";
import type { AnalysisListItem } from "@/lib/analysis/types";
import { ScoreGauge } from "./score-gauge";

export function AnalysisIndex() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    fetchAnalyses({ domain: domain || undefined })
      .then((r) => {
        setAnalyses(r.analyses);
        setLoading(false);
      })
      .catch(() => {
        setAnalyses([]);
        setLoading(false);
      });
  }, [domain]);

  return (
    <div className="space-y-4">
      <header className="border-b border-cyan-900/40 pb-4">
        <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-600">
          OPS / ANALYSIS
        </p>
        <h1 className="font-mono text-2xl font-semibold text-cyan-50">
          ANALYSIS REPORTS
        </h1>
      </header>

      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="Filter by domain…"
        className="w-full max-w-sm rounded border border-cyan-900/50 bg-[#0a0e14] px-3 py-2 font-mono text-xs text-cyan-200 focus:border-cyan-600 focus:outline-none"
      />

      {loading ? (
        <p className="font-mono text-sm text-cyan-700">Loading…</p>
      ) : analyses.length === 0 ? (
        <p className="font-mono text-sm text-cyan-700">
          No analyses yet. Submit sites via Intake and run the worker.
        </p>
      ) : (
        <ul className="space-y-2">
          {analyses.map((row) => (
            <li key={row.id}>
              <Link
                href={`/analysis/${row.websiteId}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded border border-cyan-900/40 bg-[#0d1219] px-4 py-3 transition hover:border-cyan-700/50"
              >
                <div>
                  <p className="font-mono text-sm text-cyan-100">{row.domain}</p>
                  <p className="font-mono text-[10px] text-cyan-600">
                    {row.status}
                    {row.analyzedAt &&
                      ` · ${new Date(row.analyzedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="w-20">
                    <ScoreGauge label="OVERALL" score={row.overallScore} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
