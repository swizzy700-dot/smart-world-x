import { handleApiError, jsonOk } from "@/lib/api/response";
import { listJobs } from "@/lib/queue/queue-service";
import { jobListQuerySchema } from "@/lib/queue/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = jobListQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      websiteStatus: searchParams.get("websiteStatus") ?? undefined,
      domain: searchParams.get("domain") ?? undefined,
      batchId: searchParams.get("batchId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const result = await listJobs(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
