import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";
import {
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "./constants";

export interface SendMailInput {
  from: string;
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html?: string | null;
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

let transporter: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_FROM);
}

export function getTransporter(): Transporter {
  if (!isSmtpConfigured()) {
    throw new SmtpError("SMTP is not configured (SMTP_HOST, SMTP_FROM required)");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth:
        SMTP_USER && SMTP_PASS
          ? { user: SMTP_USER, pass: SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const transport = getTransporter();

  const to =
    input.toName && input.toName.trim()
      ? `"${input.toName.replace(/"/g, "")}" <${input.to}>`
      : input.to;

  const info = await transport.sendMail({
    from: input.from,
    to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? undefined,
  });

  const messageId =
    typeof info.messageId === "string" ? info.messageId : String(info.messageId);

  return {
    messageId,
    accepted: (info.accepted as string[]) ?? [],
    rejected: (info.rejected as string[]) ?? [],
  };
}

export class SmtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmtpError";
  }
}
