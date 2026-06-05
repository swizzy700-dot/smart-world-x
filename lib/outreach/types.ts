import type {
  OutreachProviderType,
  OutreachStatus,
} from "@prisma/client";
import type { BusinessFinding } from "@/lib/analysis/types";

export interface OutreachContactInput {
  email: string | null;
  phone: string | null;
  primaryEmail: string | null;
  allEmails: string[];
}

export interface OutreachAnalysisInput {
  overallScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
  executiveSummary: string | null;
  pageTitle: string | null;
  topFindings: BusinessFinding[];
}

export interface OutreachWebsiteInput {
  domain: string;
  normalizedUrl: string;
  pageTitle: string | null;
}

/** Aggregated input for outreach generation. */
export interface OutreachContext {
  websiteId: string;
  website: OutreachWebsiteInput;
  contacts: OutreachContactInput;
  analysis: OutreachAnalysisInput | null;
}

export interface OutreachGenerationResult {
  subject: string;
  body: string;
  recipientEmail: string | null;
  recipientName: string | null;
  provider: OutreachProviderType;
  providerModel: string | null;
  promptVersion: string;
  meta?: Record<string, unknown>;
}

export interface OutreachDraftRecord {
  id: string;
  websiteId: string;
  version: number;
  status: OutreachStatus;
  subject: string | null;
  body: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  provider: OutreachProviderType;
  providerModel: string | null;
  promptVersion: string;
  errorMessage: string | null;
  generatedAt: string | null;
  website: {
    domain: string;
    normalizedUrl: string;
  };
}
