import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  getFollowUpSchedule,
  cancelFollowUpSchedule,
  FollowUpError,
} from "@/lib/followup";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getFollowUpSchedule(id);
    if (!result) {
      return handleApiError(new FollowUpError("Not found", "NOT_FOUND"));
    }
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason as string | undefined;

    const result = await cancelFollowUpSchedule(id, reason);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
