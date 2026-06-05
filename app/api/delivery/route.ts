import { handleApiError, jsonOk } from "@/lib/api/response";
import { listEmailMessages } from "@/lib/delivery/delivery-service";
import { emailListQuerySchema } from "@/lib/delivery/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = emailListQuerySchema.parse({
      status: searchParams.get("status") ?? undefined,
      domain: searchParams.get("domain") ?? undefined,
      websiteId: searchParams.get("websiteId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const result = await listEmailMessages(query);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
