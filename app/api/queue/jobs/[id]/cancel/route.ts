import { handleApiError, jsonOk } from "@/lib/api/response";
import { cancelJob, QueueError } from "@/lib/queue/queue-service";
import { cancelJobSchema } from "@/lib/queue/schemas";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = cancelJobSchema.parse(body);
    await cancelJob(id, reason);
    return jsonOk({ cancelled: true });
  } catch (error) {
    if (error instanceof QueueError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
