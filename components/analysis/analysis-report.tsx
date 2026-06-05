"use client";

import { useEffect, useState } from "react";
import { fetchAnalysis } from "@/lib/analysis/client";
import type { AnalysisRecord } from "@/lib/analysis/types";
import { FindingsList } from "./findings-list";
import { ScoreGauge } from "./score-gauge";

interface AnalysisReportProps {
  websiteId: string;
}

export function AnalysisReport({ websiteId }: AnalysisReportProps) {
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis(websiteId)
      .then(setAnalysis)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [websiteId]);

  if (loading) {
    return (
      <p className="font-mono text-sm text-cyan-600 animate-pulse">
        Loading analysis…
      </p>
    );
  }

  if (error || !analysis) {
    return (
      <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
        {error ?? "Analysis not found. Run the queue worker to process this site."}
      </p>
    );
  }

  if (analysis.status === "FAILED") {
    return (
      <div className="space-y-4">
        <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-sm text-red-300">
          Analysis failed: {analysis.errorMessage ?? "Unknown error"}
        </p>
      </div>
    );
  }

  if (analysis.status !== "COMPLETED") {
    return (
      <p className="font-mono text-sm text-amber-400">
        Analysis status: {analysis.status} — check back after processing completes.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-cyan-900/40 pb-4">
        <p className="font-mono text-[10px] tracking-widest text-cyan-600">
          {analysis.website.domain}
        </p>
        <h1 className="font-mono text-xl font-semibold text-cyan-50">
          {analysis.pageTitle ?? analysis.finalUrl ?? analysis.website.normalizedUrl}
        </h1>
        <p className="mt-1 font-mono text-xs text-cyan-700">
          {analysis.finalUrl} · {analysis.formFactor} · Lighthouse{" "}
          {analysis.lighthouseVersion} · {analysis.durationMs}ms
        </p>
      </header>

      {analysis.executiveSummary && (
        <div className="rounded border border-cyan-800/40 bg-cyan-950/20 px-4 py-3">
          <p className="font-mono text-[10px] tracking-widest text-cyan-500">
            EXECUTIVE SUMMARY
          </p>
          <p className="mt-2 text-sm leading-relaxed text-cyan-100">
            {analysis.executiveSummary}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ScoreGauge label="OVERALL" score={analysis.overallScore} />
        <ScoreGauge label="PERFORMANCE" score={analysis.performanceScore} />
        <ScoreGauge label="ACCESSIBILITY" score={analysis.accessibilityScore} />
        <ScoreGauge label="SEO" score={analysis.seoScore} />
        <ScoreGauge
          label="BEST PRACTICES"
          score={analysis.bestPracticesScore}
        />
      </div>

      <section>
        <h2 className="mb-3 font-mono text-[10px] tracking-widest text-cyan-600">
          BUSINESS FINDINGS
        </h2>
        <FindingsList findings={analysis.findings} />
      </section>
    </div>
  );
}
