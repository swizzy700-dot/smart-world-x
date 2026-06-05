import {
  OutreachError,
  runOutreachGeneration,
} from "@/lib/outreach/outreach-service";
import { handleApiError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const { websiteId } = await params;
    const draft = await runOutreachGeneration(websiteId);
    return jsonOk(draft, 201);
  } catch (error) {
    if (error instanceof OutreachError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
