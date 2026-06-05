import { handleApiError, jsonOk } from "@/lib/api/response";
import { getFollowUpHistory } from "@/lib/followup";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("websiteId");

    if (!websiteId) {
      return handleApiError(new Error("websiteId is required"));
    }

    const result = await getFollowUpHistory(websiteId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
