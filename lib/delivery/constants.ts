export const EMAIL_QUEUE_NAME = "email-delivery";
export const EMAIL_JOB_NAME = "send-email";

export const EMAIL_WORKER_CONCURRENCY = Number(
  process.env.EMAIL_WORKER_CONCURRENCY ?? 3,
);

export const EMAIL_MAX_ATTEMPTS = Number(process.env.EMAIL_MAX_ATTEMPTS ?? 3);

export const EMAIL_RETRY_DELAY_MS = Number(
  process.env.EMAIL_RETRY_DELAY_MS ?? 30_000,
);

export const EMAIL_POLL_INTERVAL_MS = Number(
  process.env.EMAIL_POLL_INTERVAL_MS ?? 3000,
);

export const SMTP_HOST = process.env.SMTP_HOST ?? "";
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const SMTP_USER = process.env.SMTP_USER ?? "";
export const SMTP_PASS = process.env.SMTP_PASS ?? "";
export const SMTP_FROM = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "";
