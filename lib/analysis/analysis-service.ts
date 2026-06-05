import { AnalysisStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  AnalysisListItem,
  AnalysisRecord,
  BusinessFinding,
} from "./types";

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export async function runWebsiteAnalysis(
  websiteId: string,
  url: string,
): Promise<AnalysisRecord> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, domain: true, normalizedUrl: true, rawUrl: true },
  });

  if (!website) {
    throw new AnalysisError("Website not found", "WEBSITE_NOT_FOUND");
  }

  const analysis = await prisma.websiteAnalysis.upsert({
    where: { websiteId },
    create: {
      websiteId,
      status: AnalysisStatus.RUNNING,
      findings: [],
    },
    update: {
      status: AnalysisStatus.RUNNING,
      errorMessage: null,
    },
  });

  try {
    const { runLighthouse, attachExecutiveSummary } = await import(
      "./lighthouse-runner"
    );
    const lighthouseResult = attachExecutiveSummary(
      await runLighthouse(url),
      website.domain,
    );

    const updated = await prisma.websiteAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: AnalysisStatus.COMPLETED,
        performanceScore: lighthouseResult.scores.performance,
        accessibilityScore: lighthouseResult.scores.accessibility,
        seoScore: lighthouseResult.scores.seo,
        bestPracticesScore: lighthouseResult.scores.bestPractices,
        overallScore: lighthouseResult.scores.overall,
        lighthouseVersion: lighthouseResult.lighthouseVersion,
        formFactor: lighthouseResult.formFactor,
        finalUrl: lighthouseResult.finalUrl,
        pageTitle: lighthouseResult.pageTitle,
        fetchTimeMs: lighthouseResult.fetchTimeMs,
        durationMs: lighthouseResult.durationMs,
        rawReport: lighthouseResult.rawReport as Prisma.InputJsonValue,
        findings: lighthouseResult.findings as unknown as Prisma.InputJsonValue,
        executiveSummary: lighthouseResult.executiveSummary,
        analyzedAt: new Date(),
        errorMessage: null,
      },
      include: {
        website: {
          select: { domain: true, normalizedUrl: true, rawUrl: true },
        },
      },
    });

    return toAnalysisRecord(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lighthouse analysis failed";

    await prisma.websiteAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: AnalysisStatus.FAILED,
        errorMessage: message.slice(0, 2000),
        analyzedAt: new Date(),
      },
    });

    throw new AnalysisError(message, "ANALYSIS_FAILED");
  }
}

export async function getAnalysisByWebsiteId(
  websiteId: string,
): Promise<AnalysisRecord | null> {
  const row = await prisma.websiteAnalysis.findUnique({
    where: { websiteId },
    include: {
      website: {
        select: { domain: true, normalizedUrl: true, rawUrl: true },
      },
    },
  });

  if (!row) return null;
  return toAnalysisRecord(row);
}

export async function listAnalyses(params: {
  status?: AnalysisStatus;
  domain?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ analyses: AnalysisListItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 20), 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.WebsiteAnalysisWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.domain) {
    where.website = {
      domain: { contains: params.domain, mode: "insensitive" },
    };
  }

  const [rows, total] = await Promise.all([
    prisma.websiteAnalysis.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { analyzedAt: "desc" },
      include: {
        website: { select: { domain: true, normalizedUrl: true } },
      },
    }),
    prisma.websiteAnalysis.count({ where }),
  ]);

  return {
    analyses: rows.map((row) => ({
      id: row.id,
      websiteId: row.websiteId,
      domain: row.website.domain,
      normalizedUrl: row.website.normalizedUrl,
      status: row.status,
      overallScore: row.overallScore,
      performanceScore: row.performanceScore,
      accessibilityScore: row.accessibilityScore,
      seoScore: row.seoScore,
      bestPracticesScore: row.bestPracticesScore,
      analyzedAt: row.analyzedAt?.toISOString() ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

function toAnalysisRecord(row: {
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
  findings: unknown;
  executiveSummary: string | null;
  errorMessage: string | null;
  analyzedAt: Date | null;
  website: { domain: string; normalizedUrl: string; rawUrl: string };
}): AnalysisRecord {
  return {
    id: row.id,
    websiteId: row.websiteId,
    status: row.status,
    performanceScore: row.performanceScore,
    accessibilityScore: row.accessibilityScore,
    seoScore: row.seoScore,
    bestPracticesScore: row.bestPracticesScore,
    overallScore: row.overallScore,
    lighthouseVersion: row.lighthouseVersion,
    formFactor: row.formFactor,
    finalUrl: row.finalUrl,
    pageTitle: row.pageTitle,
    fetchTimeMs: row.fetchTimeMs,
    durationMs: row.durationMs,
    findings: (row.findings as BusinessFinding[]) ?? [],
    executiveSummary: row.executiveSummary,
    errorMessage: row.errorMessage,
    analyzedAt: row.analyzedAt?.toISOString() ?? null,
    website: row.website,
  };
}
