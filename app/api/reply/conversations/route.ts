import { handleApiError, jsonOk } from "@/lib/api/response";
import { getConversationHistory } from "@/lib/reply/conversation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("websiteId");

    if (!websiteId) {
      return handleApiError(new Error("websiteId is required"));
    }

    const history = await getConversationHistory(websiteId);
    return jsonOk(history);
  } catch (error) {
    return handleApiError(error);
  }
}