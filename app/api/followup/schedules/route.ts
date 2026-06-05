import { handleApiError, jsonOk } from "@/lib/api/response";
import {
  createAllFollowUpSchedules,
  FollowUpError,
} from "@/lib/followup";
import { createFollowUpScheduleSchema } from "@/lib/followup/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createFollowUpScheduleSchema.parse(body);

    const result = await createAllFollowUpSchedules(
      input.websiteId,
      input.initialEmailId,
    );

    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof FollowUpError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
