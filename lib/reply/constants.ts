export const REPLY_MONITORING_QUEUE_NAME = "reply-monitoring";
export const REPLY_MONITORING_JOB_NAME = "check-inbox";

export const DEFAULT_POLL_INTERVAL_MINUTES = 5;
export const IMAP_DEFAULT_PORT = 993;
export const IMAP_DEFAULT_TLS = true;

export const REPLY_CONFIDENCE_THRESHOLD = 0.7;

export const LEAD_STATUS = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  REPLIED: "REPLIED",
  ENGAGED: "ENGAGED",
  CONVERTED: "CONVERTED",
} as const;
