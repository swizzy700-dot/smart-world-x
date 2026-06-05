import {
  AUDIT_TRANSLATIONS,
  CATEGORY_SUMMARIES,
} from "./audit-translations";
import {
  CATEGORY_LABELS,
  LIGHTHOUSE_CATEGORIES,
  MAX_FINDINGS_PER_CATEGORY,
  type LighthouseCategory,
} from "./constants";
import type { BusinessFinding, FindingSeverity, LighthouseScores } from "./types";

interface LhrAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
}

interface LhrCategory {
  id?: string;
  score?: number | null;
  auditRefs?: { id: string; weight?: number }[];
}

export interface LighthouseReport {
  categories?: Record<string, LhrCategory>;
  audits?: Record<string, LhrAudit>;
  finalUrl?: string;
}

function scoreToPercent(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  return Math.round(score * 100);
}

function severityFromScore(score: number | null): FindingSeverity {
  if (score === null) return "info";
  if (score < 50) return "critical";
  if (score < 70) return "high";
  if (score < 90) return "medium";
  return "info";
}

function categorySeverityLabel(score: number | null): "strong" | "moderate" | "weak" {
  if (score === null || score >= 90) return "strong";
  if (score >= 50) return "moderate";
  return "weak";
}

export function extractScores(report: LighthouseReport): LighthouseScores {
  const c = report.categories ?? {};
  const performance = scoreToPercent(c.performance?.score);
  const accessibility = scoreToPercent(c.accessibility?.score);
  const seo = scoreToPercent(c.seo?.score);
  const bestPractices = scoreToPercent(c["best-practices"]?.score);

  const parts = [performance, accessibility, seo, bestPractices].filter(
    (s): s is number => s !== null,
  );
  const overall =
    parts.length > 0
      ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
      : null;

  return {
    performance,
    accessibility,
    seo,
    bestPractices,
    overall,
  };
}

function auditFinding(
  auditId: string,
  category: LighthouseCategory,
  audit: LhrAudit,
): BusinessFinding {
  const translation = AUDIT_TRANSLATIONS[auditId];
  const score = scoreToPercent(audit.score);

  return {
    id: `${category}-${auditId}`,
    severity: severityFromScore(score),
    category,
    title: translation?.title ?? audit.title ?? auditId,
    description:
      translation?.description ??
      stripMarkdown(audit.description ?? "An issue was detected on this page."),
    recommendation:
      translation?.recommendation ??
      "Review this item in Lighthouse and assign to your web team.",
    score: score ?? undefined,
    auditId,
  };
}

function stripMarkdown(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
}

function categoryOverviewFinding(
  category: LighthouseCategory,
  score: number | null,
): BusinessFinding {
  const label = CATEGORY_LABELS[category];
  const tier = categorySeverityLabel(score);
  const summary = CATEGORY_SUMMARIES[category][tier];

  return {
    id: `overview-${category}`,
    severity: severityFromScore(score),
    category,
    title: `${label}: ${score ?? "—"}/100`,
    description: summary,
    recommendation:
      tier === "strong"
        ? `Maintain current ${label.toLowerCase()} standards as you publish updates.`
        : `Prioritize ${label.toLowerCase()} improvements in the next site update cycle.`,
    score: score ?? undefined,
  };
}

function collectFailedAudits(
  report: LighthouseReport,
  category: LighthouseCategory,
): BusinessFinding[] {
  const cat = report.categories?.[category];
  const audits = report.audits ?? {};
  if (!cat?.auditRefs) return [];

  const findings: BusinessFinding[] = [];

  for (const ref of cat.auditRefs) {
    const audit = audits[ref.id];
    if (!audit) continue;
    if (audit.scoreDisplayMode === "notApplicable" || audit.scoreDisplayMode === "manual") {
      continue;
    }
    if (audit.score === null || audit.score === undefined) continue;
    if (audit.score >= 0.9) continue;

    findings.push(auditFinding(ref.id, category, audit));
    if (findings.length >= MAX_FINDINGS_PER_CATEGORY) break;
  }

  return findings;
}

export function generateFindings(
  report: LighthouseReport,
  scores: LighthouseScores,
): BusinessFinding[] {
  const findings: BusinessFinding[] = [];

  for (const category of LIGHTHOUSE_CATEGORIES) {
    const score =
      category === "performance"
        ? scores.performance
        : category === "accessibility"
          ? scores.accessibility
          : category === "seo"
            ? scores.seo
            : scores.bestPractices;

    findings.push(categoryOverviewFinding(category, score));
    findings.push(...collectFailedAudits(report, category));
  }

  if (scores.overall !== null) {
    findings.unshift({
      id: "overview-overall",
      severity: severityFromScore(scores.overall),
      category: "overall",
      title: `Overall site health: ${scores.overall}/100`,
      description: buildOverallDescription(scores),
      recommendation: buildOverallRecommendation(scores),
      score: scores.overall,
    });
  }

  const severityOrder: Record<FindingSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };

  return findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

function buildOverallDescription(scores: LighthouseScores): string {
  const weak: string[] = [];
  if (scores.performance !== null && scores.performance < 70) weak.push("speed");
  if (scores.accessibility !== null && scores.accessibility < 70) {
    weak.push("accessibility");
  }
  if (scores.seo !== null && scores.seo < 70) weak.push("SEO");
  if (scores.bestPractices !== null && scores.bestPractices < 70) {
    weak.push("technical quality");
  }

  if (weak.length === 0) {
    return "This website scores well across core quality dimensions. Minor improvements may still be available.";
  }

  return `This website needs attention in: ${weak.join(", ")}. These factors influence visitor trust, conversions, and search visibility.`;
}

function buildOverallRecommendation(scores: LighthouseScores): string {
  const lowest = [
    { label: "performance", score: scores.performance },
    { label: "accessibility", score: scores.accessibility },
    { label: "SEO", score: scores.seo },
    { label: "best practices", score: scores.bestPractices },
  ]
    .filter((x): x is { label: string; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score);

  if (lowest.length === 0) {
    return "Continue monitoring after each site update.";
  }

  const target = lowest[0];
  return `Start with ${target.label} (score ${target.score}/100) for the highest-impact improvements.`;
}

export function generateExecutiveSummary(
  domain: string,
  scores: LighthouseScores,
  findings: BusinessFinding[],
): string {
  const overall = scores.overall ?? "N/A";
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;

  const topIssue = findings.find(
    (f) => f.severity === "critical" || f.severity === "high",
  );

  let summary = `Analysis of ${domain} shows an overall Lighthouse score of ${overall}/100. `;

  if (critical + high === 0) {
    summary +=
      "No critical issues were identified. The site is in good shape for outreach conversations about incremental improvements.";
  } else {
    summary += `${critical + high} high-priority item(s) warrant attention before positioning the site as fully optimized. `;
    if (topIssue) {
      summary += `Top concern: ${topIssue.title}.`;
    }
  }

  return summary;
}
