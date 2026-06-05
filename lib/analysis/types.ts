import type { AnalysisStatus, Prisma } from "@prisma/client";
import type { LighthouseCategory } from "./constants";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface BusinessFinding {
  id: string;
  severity: FindingSeverity;
  category: LighthouseCategory | "overall";
  title: string;
  description: string;
  recommendation: string;
  score?: number;
  auditId?: string;
}

export interface LighthouseScores {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
  overall: number | null;
}

export interface LighthouseRunResult {
  scores: LighthouseScores;
  finalUrl: string;
  pageTitle: string | null;
  lighthouseVersion: string;
  formFactor: string;
  fetchTimeMs: number;
  durationMs: number;
  rawReport: Prisma.JsonValue;
  findings: BusinessFinding[];
  executiveSummary: string;
}

export interface AnalysisRecord {
  id: string;
  websiteId: string;
  status: AnalysisStatus;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  overallScore: number | null;
  lighthouseVersion: string | null;
  formFactor: string | null;
  finalUrl: string | null;
  pageTitle: string | null;
  fetchTimeMs: number | null;
  durationMs: number | null;
  findings: BusinessFinding[];
  executiveSummary: string | null;
  errorMessage: string | null;
  analyzedAt: string | null;
  website: {
    domain: string;
    normalizedUrl: string;
    rawUrl: string;
  };
}

export interface AnalysisListItem {
  id: string;
  websiteId: string;
  domain: string;
  normalizedUrl: string;
  status: AnalysisStatus;
  overallScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  analyzedAt: string | null;
}
