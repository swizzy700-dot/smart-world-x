import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  listFollowUpSchedules,
  getFollowUpStats,
  getReplyStats,
} from "@/lib/followup";
import { followUpListQuerySchema } from "@/lib/followup/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = followUpListQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      websiteId: searchParams.get("websiteId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const result = await listFollowUpSchedules(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const [followUpStats, replyStats] = await Promise.all([
        getFollowUpStats(),
        getReplyStats(),
      ]);
      return jsonOk({ followUp: followUpStats, reply: replyStats });
    }

    return handleApiError(new Error("Invalid action"));
  } catch (error) {
    return handleApiError(error);
  }
}
