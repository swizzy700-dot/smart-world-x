import { EmailDeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logEmailActivity } from "./activity";
import { sendMail, SmtpError } from "./smtp-client";

/**
 * Sends a single email message via SMTP and updates DB status.
 */
export async function executeEmailSend(
  emailMessageId: string,
  options?: { attemptNumber?: number },
): Promise<void> {
  const msg = await prisma.emailMessage.findUnique({
    where: { id: emailMessageId },
  });

  if (!msg) {
    throw new Error(`Email message not found: ${emailMessageId}`);
  }

  if (msg.status === EmailDeliveryStatus.SENT) {
    return;
  }

  const attemptNumber = options?.attemptNumber ?? msg.attempts + 1;

  await prisma.emailMessage.update({
    where: { id: emailMessageId },
    data: {
      status: EmailDeliveryStatus.SENDING,
      attempts: attemptNumber,
      lastError: null,
    },
  });

  await logEmailActivity(
    emailMessageId,
    "SENDING",
    `Sending email (attempt ${attemptNumber}/${msg.maxAttempts})`,
    { attempt: attemptNumber },
  );

  try {
    const result = await sendMail({
      from: msg.fromAddress,
      to: msg.toAddress,
      toName: msg.toName,
      subject: msg.subject,
      text: msg.bodyText,
      html: msg.bodyHtml,
    });

    await prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: {
        status: EmailDeliveryStatus.SENT,
        messageId: result.messageId,
        sentAt: new Date(),
        failedAt: null,
        lastError: null,
      },
    });

    await logEmailActivity(emailMessageId, "SENT", "Email delivered successfully", {
      messageId: result.messageId,
      accepted: result.accepted,
      attempt: attemptNumber,
    });
  } catch (error) {
    const message =
      error instanceof SmtpError || error instanceof Error
        ? error.message
        : "SMTP send failed";

    const terminal = attemptNumber >= msg.maxAttempts;

    await prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: {
        status: terminal ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.PENDING,
        lastError: message.slice(0, 2000),
        failedAt: terminal ? new Date() : null,
      },
    });

    await logEmailActivity(
      emailMessageId,
      terminal ? "FAILED" : "RETRY",
      terminal ? `Delivery failed: ${message}` : `Will retry: ${message}`,
      { attempt: attemptNumber, terminal },
    );

    if (!terminal) {
      throw error;
    }
  }
}
