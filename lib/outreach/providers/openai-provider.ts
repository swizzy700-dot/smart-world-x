import { OutreachProviderType } from "@prisma/client";
import {
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OUTREACH_MAX_BODY_LENGTH,
  OUTREACH_MAX_SUBJECT_LENGTH,
  OUTREACH_PROMPT_VERSION,
} from "../constants";
import type { OutreachContext, OutreachGenerationResult } from "../types";
import type { OutreachProvider } from "./types";
import { OutreachProviderError } from "./types";

const SYSTEM_PROMPT = `You write concise, professional B2B outreach emails for a web intelligence platform.
Rules:
- Use findings from the site analysis only; do not invent facts.
- Tone: helpful, consultative, not pushy.
- Output valid JSON only: {"subject":"...","body":"..."}
- Subject under 120 characters.
- Body 150-250 words, plain text, use line breaks between paragraphs.`;

/**
 * OpenAI-backed outreach generator.
 * Activated when OUTREACH_PROVIDER=openai and OPENAI_API_KEY is set.
 */
export class OpenAIOutreachProvider implements OutreachProvider {
  readonly id = "openai";
  readonly displayName = "OpenAI";

  async generate(context: OutreachContext): Promise<OutreachGenerationResult> {
    if (!OPENAI_API_KEY) {
      throw new OutreachProviderError(
        "OPENAI_API_KEY is not configured",
        this.id,
      );
    }

    const userPrompt = buildPrompt(context);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new OutreachProviderError(
        `OpenAI API error: ${response.status} ${err.slice(0, 200)}`,
        this.id,
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new OutreachProviderError("Empty OpenAI response", this.id);
    }

    const parsed = JSON.parse(content) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) {
      throw new OutreachProviderError("Invalid JSON from OpenAI", this.id);
    }

    return {
      subject: parsed.subject.slice(0, OUTREACH_MAX_SUBJECT_LENGTH),
      body: parsed.body.slice(0, OUTREACH_MAX_BODY_LENGTH),
      recipientEmail: context.contacts.primaryEmail,
      recipientName: null,
      provider: OutreachProviderType.OPENAI,
      providerModel: OPENAI_MODEL,
      promptVersion: OUTREACH_PROMPT_VERSION,
      meta: {
        tokens: data.usage?.total_tokens,
      },
    };
  }
}

function buildPrompt(context: OutreachContext): string {
  const { website, contacts, analysis } = context;

  return JSON.stringify(
    {
      task: "Write outreach email for website owner",
      website: {
        domain: website.domain,
        url: website.normalizedUrl,
        pageTitle: website.pageTitle,
      },
      recipient: {
        email: contacts.primaryEmail,
      },
      analysis: analysis
        ? {
            overallScore: analysis.overallScore,
            performance: analysis.performanceScore,
            accessibility: analysis.accessibilityScore,
            seo: analysis.seoScore,
            bestPractices: analysis.bestPracticesScore,
            summary: analysis.executiveSummary,
            topIssues: analysis.topFindings.map((f) => ({
              title: f.title,
              recommendation: f.recommendation,
            })),
          }
        : null,
    },
    null,
    2,
  );
}
