import { listOutreachDrafts } from "@/lib/outreach/outreach-service";
import { outreachListQuerySchema } from "@/lib/outreach/schemas";
import { handleApiError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = outreachListQuerySchema.parse({
      websiteId: searchParams.get("websiteId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      domain: searchParams.get("domain") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const result = await listOutreachDrafts(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
