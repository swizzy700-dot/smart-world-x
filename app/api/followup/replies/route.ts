import { handleApiError, jsonOk } from "@/lib/api/response";
import { recordReply, getRepliesByWebsite, FollowUpError } from "@/lib/followup";
import { recordReplySchema } from "@/lib/followup/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = recordReplySchema.parse(body);

    const result = await recordReply(
      input.websiteId,
      input.originalEmailId,
      {
        replySubject: input.replySubject,
        replyBody: input.replyBody,
        replyFrom: input.replyFrom,
        replyDate: input.replyDate ? new Date(input.replyDate) : undefined,
      },
    );

    return jsonOk(result, 201);
  } catch (error) {
    if (error instanceof FollowUpError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("websiteId");

    if (!websiteId) {
      return handleApiError(new Error("websiteId is required"));
    }

    const result = await getRepliesByWebsite(websiteId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
