import type { BusinessFinding } from "@/lib/analysis/types";
import { prisma } from "@/lib/db";
import type { OutreachContext } from "./types";

const MAX_TOP_FINDINGS = 5;

export async function buildOutreachContext(
  websiteId: string,
): Promise<OutreachContext> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: {
      analysis: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { confidence: "desc" }],
      },
    },
  });

  if (!website) {
    throw new Error(`Website not found: ${websiteId}`);
  }

  const emails = website.contacts
    .filter((c) => c.type === "EMAIL")
    .map((c) => c.value);
  const phones = website.contacts
    .filter((c) => c.type === "PHONE")
    .map((c) => c.value);

  const primary = website.contacts.find(
    (c) => c.isPrimary && c.type === "EMAIL",
  );

  const findings = (website.analysis?.findings as BusinessFinding[] | null) ?? [];
  const topFindings = [...findings]
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, MAX_TOP_FINDINGS);

  if (topFindings.length < MAX_TOP_FINDINGS) {
    for (const f of findings) {
      if (topFindings.some((t) => t.id === f.id)) continue;
      if (f.category === "overall") continue;
      topFindings.push(f);
      if (topFindings.length >= MAX_TOP_FINDINGS) break;
    }
  }

  return {
    websiteId,
    website: {
      domain: website.domain,
      normalizedUrl: website.normalizedUrl,
      pageTitle: website.analysis?.pageTitle ?? null,
    },
    contacts: {
      email: primary?.value ?? emails[0] ?? null,
      phone: phones[0] ?? null,
      primaryEmail: primary?.value ?? emails[0] ?? null,
      allEmails: emails,
    },
    analysis: website.analysis
      ? {
          overallScore: website.analysis.overallScore,
          performanceScore: website.analysis.performanceScore,
          accessibilityScore: website.analysis.accessibilityScore,
          seoScore: website.analysis.seoScore,
          bestPracticesScore: website.analysis.bestPracticesScore,
          executiveSummary: website.analysis.executiveSummary,
          pageTitle: website.analysis.pageTitle,
          topFindings,
        }
      : null,
  };
}

export function serializeContextSnapshot(
  context: OutreachContext,
): Record<string, unknown> {
  return {
    website: context.website,
    contacts: {
      primaryEmail: context.contacts.primaryEmail,
      allEmails: context.contacts.allEmails,
      phone: context.contacts.phone,
    },
    analysis: context.analysis
      ? {
          overallScore: context.analysis.overallScore,
          executiveSummary: context.analysis.executiveSummary,
          topFindingTitles: context.analysis.topFindings.map((f) => f.title),
        }
      : null,
  };
}
