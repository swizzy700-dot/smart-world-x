import type {
  ContactSource,
  ContactType,
  ExtractionStatus,
} from "@prisma/client";

export interface RawContactHit {
  type: ContactType;
  value: string;
  displayValue?: string;
  source: ContactSource;
  sourceUrl: string;
  contactPageUrl?: string;
}

export interface PageFetchResult {
  url: string;
  html: string;
  finalUrl: string;
}

export interface ExtractionResult {
  websiteId: string;
  status: ExtractionStatus;
  contactPageUrl: string | null;
  pagesScanned: number;
  contacts: StoredContact[];
  emailCount: number;
  phoneCount: number;
  durationMs: number;
  errorMessage?: string;
}

export interface StoredContact {
  id: string;
  type: ContactType;
  value: string;
  displayValue: string | null;
  source: ContactSource;
  sourceUrl: string;
  contactPageUrl: string | null;
  confidence: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ContactExtractionRecord {
  id: string;
  websiteId: string;
  status: ExtractionStatus;
  contactPageUrl: string | null;
  pagesScanned: number;
  emailCount: number;
  phoneCount: number;
  errorMessage: string | null;
  extractedAt: string | null;
  durationMs: number | null;
  contacts: StoredContact[];
  website: {
    domain: string;
    normalizedUrl: string;
  };
}
