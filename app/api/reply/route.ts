import { handleApiError, jsonOk } from "@/lib/api/response";
import { getLeadStatusStats, setLeadStatus } from "@/lib/reply/lead-status-service";
import { getConversationStats } from "@/lib/reply/conversation-service";
import { isReplyMonitoringEnabled, getReplyMonitoringConfig } from "@/lib/reply/email-monitor";
import { LeadStatus } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const setLeadStatusSchema = z.object({
  websiteId: z.string().cuid(),
  status: z.enum(["NEW", "CONTACTED", "REPLIED", "ENGAGED", "CONVERTED"]),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const [leadStats, conversationStats, monitoringEnabled] = await Promise.all([
        getLeadStatusStats(),
        getConversationStats(),
        Promise.resolve(isReplyMonitoringEnabled()),
      ]);

      const config = monitoringEnabled ? getReplyMonitoringConfig() : null;

      return jsonOk({
        leadStatus: leadStats,
        conversation: conversationStats,
        monitoring: {
          enabled: monitoringEnabled,
          config: config
            ? {
                imapHost: config.imapHost,
                imapPort: config.imapPort,
                imapUser: config.imapUser,
                pollIntervalMinutes: config.pollIntervalMinutes,
              }
            : null,
        },
      });
    }

    return handleApiError(new Error("Invalid action"));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "set-lead-status") {
      const body = await request.json();
      const input = setLeadStatusSchema.parse(body);

      await setLeadStatus(input.websiteId, input.status as LeadStatus);

      return jsonOk({ success: true });
    }

    return handleApiError(new Error("Invalid action"));
  } catch (error) {
    return handleApiError(error);
  }
}
