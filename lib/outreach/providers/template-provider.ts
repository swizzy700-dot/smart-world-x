import { OutreachProviderType } from "@prisma/client";
import {
  OUTREACH_MAX_BODY_LENGTH,
  OUTREACH_MAX_SUBJECT_LENGTH,
  OUTREACH_PROMPT_VERSION,
} from "../constants";
import type { OutreachContext, OutreachGenerationResult } from "../types";
import type { OutreachProvider } from "./types";

/**
 * Rule-based outreach generator — no external AI required.
 * Uses analysis scores and findings to personalize copy.
 */
export class TemplateOutreachProvider implements OutreachProvider {
  readonly id = "template";
  readonly displayName = "Template Engine";

  async generate(context: OutreachContext): Promise<OutreachGenerationResult> {
    const { website, contacts, analysis } = context;
   const rawName = website.pageTitle ?? website.domain;
const siteName = rawName
  .replace(/^https?:\/\//, "")
  .replace(/^www\./, "")
  .split(".")[0]
  .replace(/-/g, " ")
  .replace(/\b\w/g, (c) => c.toUpperCase());

    const recipientEmail = contacts.primaryEmail;

    const weakest = getWeakestCategory(analysis);
    const hook = buildHook(analysis, weakest);
    const subject = buildSubject(website.domain, weakest, analysis?.overallScore);
    const body = buildBody({
      siteName,
      domain: website.domain,
      url: website.normalizedUrl,
      hook,
      weakest,
      analysis,
      recipientEmail,
    });

    return {
      subject: truncate(subject, OUTREACH_MAX_SUBJECT_LENGTH),
      body: truncate(body, OUTREACH_MAX_BODY_LENGTH),
      recipientEmail,
      recipientName: null,
      provider: OutreachProviderType.TEMPLATE,
      providerModel: null,
      promptVersion: OUTREACH_PROMPT_VERSION,
      meta: { engine: "template", weakestCategory: weakest?.label },
    };
  }
}

function getWeakestCategory(
  analysis: OutreachContext["analysis"],
): { label: string; score: number } | null {
  if (!analysis) return null;

  const cats = [
    { label: "site performance", score: analysis.performanceScore },
    { label: "accessibility", score: analysis.accessibilityScore },
    { label: "SEO", score: analysis.seoScore },
    { label: "technical quality", score: analysis.bestPracticesScore },
  ].filter((c): c is { label: string; score: number } => c.score !== null);

  if (cats.length === 0) return null;
  return cats.sort((a, b) => a.score - b.score)[0];
}

function buildHook(
  analysis: OutreachContext["analysis"],
  weakest: { label: string; score: number } | null,
): string {
  if (!analysis?.overallScore) {
    return "I took a quick look at your website and noticed a few opportunities that could help you reach more customers online.";
  }

  if (analysis.overallScore >= 85) {
    return "Your site is in solid shape overall there are still a few targeted improvements that could strengthen results.";
  }

  if (weakest && weakest.score < 60) {
    return `Honestly, the one area that stood out to me was ${weakest.label} there's a real opportunity to improve there (scored ${weakest.score}/100).`;
  }


  return `Based on a technical review (overall score ${analysis.overallScore}/100), there are clear wins we can help you capture.`;
}

function buildSubject(
  domain: string,
  weakest: { label: string; score: number } | null,
  overall: number | null | undefined,
): string {
  if (weakest && weakest.score < 55) {
    return `Quick note on ${domain} — ${weakest.label} improvements`;
  }
  if (overall !== null && overall !== undefined && overall < 70) {
    return `Ideas to strengthen ${domain}'s web presence`;
  }
  return `A few thoughts on ${domain}`;

}

function buildBody(params: {
  siteName: string;
  domain: string;
  url: string;
  hook: string;
  weakest: { label: string; score: number } | null;
  analysis: OutreachContext["analysis"];
  recipientEmail: string | null;
}): string {
  const { siteName, domain, url, hook, weakest, analysis } = params;

  const lines: string[] = [];

  // Warm human intro with site name called out
  lines.push(`Hey ${siteName} team,`);

  lines.push("");
  lines.push(
    `Hope you're doing well! I was browsing online and came across your website ${url} and I have to say, I spent a few minutes going through it.`,
  );
  lines.push("");
  lines.push(hook);
  lines.push("");
  lines.push(
    `I ran a quick technical review on your site and wanted to share a few things I noticed not to overwhelm you, just a concise summary that could impact your business.`,
  );

  if (analysis?.executiveSummary) {
    lines.push("");
    lines.push(analysis.executiveSummary);
  }

  if (analysis && analysis.topFindings.length > 0) {
    lines.push("");
    lines.push("Here are a few highlights from the review:");
    for (const f of analysis.topFindings.slice(0, 3)) {
  lines.push(`• ${f.title}`);
}

  } else if (weakest) {
    lines.push("");
    lines.push(
      `The biggest opportunity I spotted is ${weakest.label} currently sitting at ${weakest.score}/100. That's something that can be improved fairly quickly with the right attention.`,
    );
  }

  lines.push("");
  lines.push(
    "I work with businesses to help their websites perform better for visitors and rank stronger in search no pressure, no hard sell. If you'd like the full report or just want to have a quick chat, simply reply to this email and I'll get back to you.",
  );
  lines.push("");
  lines.push("Warm regards,");
  lines.push("Digital Growth Consultant");
  lines.push("(https://mainlinemlr.com)");
lines.push("");
  

  return lines.join("\n");
}


function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}
