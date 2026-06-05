import type {
  EmailActivityType,
  EmailDeliveryStatus,
} from "@prisma/client";

export interface EmailQueuePayload {
  emailMessageId: string;
}

export interface EmailMessageRecord {
  id: string;
  websiteId: string;
  outreachDraftId: string | null;
  status: EmailDeliveryStatus;
  fromAddress: string;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string;
  messageId: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  queuedAt: string;
  sentAt: string | null;
  failedAt: string | null;
  website: {
    domain: string;
    normalizedUrl: string;
  };
  activities: EmailActivityRecord[];
}

export interface EmailActivityRecord {
  id: string;
  type: EmailActivityType;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface QueueEmailInput {
  websiteId: string;
  outreachDraftId?: string;
  toAddress?: string;
  toName?: string;
  fromAddress?: string;
  scheduleFollowUps?: boolean;
}

export interface DeliveryStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    mode: "redis" | "database";
  };
}
