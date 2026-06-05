import { handleApiError, jsonOk } from "@/lib/api/response";
import { getQueueStats } from "@/lib/queue/queue-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getQueueStats();
    return jsonOk(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
