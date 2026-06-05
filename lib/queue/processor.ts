import { runWebsiteAnalysis } from "@/lib/analysis/analysis-service";
import { runContactExtraction } from "@/lib/contacts/contact-service";
import { runOutreachGeneration } from "@/lib/outreach/outreach-service";
import { queueOutboundEmail } from "@/lib/delivery/delivery-service";
import type { PipelineJobPayload } from "./types";
import { markJobActive, markJobCompleted, markJobStage } from "./status-sync";

/**
 * Pipeline processor — analysis, contacts, outreach generation, email send, completion.
 */
export async function processPipelineJob(
  payload: PipelineJobPayload,
  options?: { attempts?: number; incrementAttempts?: boolean },
): Promise<void> {
  await markJobActive(payload.jobId, "acquire", options);
  await markJobStage(payload.jobId, "validate");

  if (!payload.websiteId || !payload.normalizedUrl || !payload.domain) {
    throw new Error("Invalid job payload: missing required fields");
  }

  await markJobStage(payload.jobId, "analyze");
  await runWebsiteAnalysis(payload.websiteId, payload.normalizedUrl);

  await markJobStage(payload.jobId, "extract_contacts");
  await runContactExtraction(payload.websiteId, payload.normalizedUrl);

  await markJobStage(payload.jobId, "generate_outreach");
  await runOutreachGeneration(payload.websiteId);

  await markJobStage(payload.jobId, "send_email");
  try {
    await queueOutboundEmail({
      websiteId: payload.websiteId,
      scheduleFollowUps: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email queue failed";
    console.warn(`[processor] Email not queued for ${payload.domain}: ${message}`);
  }

  await markJobStage(payload.jobId, "complete");
  await markJobCompleted(payload.jobId);
}
