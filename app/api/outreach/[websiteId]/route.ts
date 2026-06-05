import {
  getLatestOutreach,
  OutreachError,
} from "@/lib/outreach/outreach-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const { websiteId } = await params;
    const draft = await getLatestOutreach(websiteId);

    if (!draft) {
      return jsonError("Outreach not found", 404, "NOT_FOUND");
    }

    return jsonOk(draft);
  } catch (error) {
    if (error instanceof OutreachError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
