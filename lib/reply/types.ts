export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface ReplyDetectionResult {
  isReply: boolean;
  originalEmailId: string | null;
  websiteId: string | null;
  confidence: number;
}

export interface ConversationHistory {
  id: string;
  websiteId: string;
  direction: "outbound" | "inbound";
  subject: string;
  body: string;
  fromAddress: string;
  toAddress: string;
  timestamp: Date;
  messageId?: string;
}

export interface ReplyMonitoringConfig {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapTls: boolean;
  pollIntervalMinutes: number;
}

export interface LeadStatus {
  NEW: "NEW";
  CONTACTED: "CONTACTED";
  REPLIED: "REPLIED";
  ENGAGED: "ENGAGED";
  CONVERTED: "CONVERTED";
}
