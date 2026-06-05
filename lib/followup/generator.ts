import { prisma } from "@/lib/db";
import { getFollowUpTemplate } from "./templates";
import type { FollowUpContext } from "./types";

export async function generateFollowUpMessage(
  scheduleId: string,
): Promise<{ subject: string; body: string; recipientEmail: string | null }> {
  const schedule = await prisma.followUpSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      website: {
        select: {
          domain: true,
          normalizedUrl: true,
        },
      },
      initialEmail: {
        select: {
          toAddress: true,
          toName: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error("Follow-up schedule not found");
  }

  const website = schedule.website;

  const analysis = await prisma.websiteAnalysis.findUnique({
    where: { websiteId: schedule.websiteId },
    select: {
      overallScore: true,
      executiveSummary: true,
      performanceScore: true,
      accessibilityScore: true,
      seoScore: true,
      bestPracticesScore: true,
      pageTitle: true,
    },
  });

  let weakestCategory: string | null = null;
  if (analysis) {
    const scores = [
      { label: "performance", score: analysis.performanceScore },
      { label: "accessibility", score: analysis.accessibilityScore },
      { label: "SEO", score: analysis.seoScore },
      { label: "technical quality", score: analysis.bestPracticesScore },
    ].filter((s) => s.score !== null) as { label: string; score: number }[];

    if (scores.length > 0) {
      const weakest = scores.sort((a, b) => a.score - b.score)[0];
      weakestCategory = weakest.label;
    }
  }

  const context: FollowUpContext = {
    website: {
      domain: website.domain,
      normalizedUrl: website.normalizedUrl,
      pageTitle: analysis?.pageTitle ?? null,
    },
    analysis: analysis
      ? {
          overallScore: analysis.overallScore,
          weakestCategory,
          executiveSummary: analysis.executiveSummary,
        }
      : null,
    recipientName: schedule.initialEmail.toName,
    recipientEmail: schedule.initialEmail.toAddress,
  };

  const template = getFollowUpTemplate(schedule.sequence);
  if (!template) {
    throw new Error(`No template found for sequence ${schedule.sequence}`);
  }

  const subject = template.subject(context);
  const body = template.body(context);

  return {
    subject,
    body,
    recipientEmail: schedule.initialEmail.toAddress,
  };
}
