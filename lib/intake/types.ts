export type IntakeLineOutcome = "valid" | "invalid" | "duplicate_batch" | "duplicate_db";

export interface ParsedIntakeLine {
  lineNumber: number;
  raw: string;
}

export interface ValidatedUrl {
  lineNumber: number;
  raw: string;
  normalizedUrl: string;
  domain: string;
}

export interface InvalidUrl {
  lineNumber: number;
  raw: string;
  reason: string;
}

export interface IntakePreviewItem {
  lineNumber: number;
  raw: string;
  outcome: IntakeLineOutcome;
  normalizedUrl?: string;
  domain?: string;
  reason?: string;
}

export interface IntakePreviewResult {
  items: IntakePreviewItem[];
  stats: IntakeStats;
}

export interface IntakeStats {
  totalLines: number;
  valid: number;
  invalid: number;
  duplicateBatch: number;
  duplicateDb: number;
  readyToInsert: number;
}

export interface IntakeExecuteResult {
  batchId: string;
  batchCode: string;
  stats: IntakeStats & {
    inserted: number;
    queued: number;
  };
  websiteIds: string[];
  jobIds: string[];
}

export interface IntakeExecuteOptions {
  autoQueue?: boolean;
  tags?: string[];
}
