import { handleApiError, jsonOk } from "@/lib/api/response";
import { reconcilePendingJobs } from "@/lib/queue/queue-service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await reconcilePendingJobs();
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
