import { handleApiError, jsonOk } from "@/lib/api/response";
import { getFollowUpStats, getReplyStats } from "@/lib/followup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [followUpStats, replyStats] = await Promise.all([
      getFollowUpStats(),
      getReplyStats(),
    ]);

    return jsonOk({ followUp: followUpStats, reply: replyStats });
  } catch (error) {
    return handleApiError(error);
  }
}
