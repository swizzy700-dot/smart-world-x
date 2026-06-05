import { handleApiError, jsonOk } from "@/lib/api/response";
import { queueWebsite, QueueError } from "@/lib/queue/queue-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await queueWebsite(id);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof QueueError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
