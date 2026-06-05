import { handleApiError, jsonOk } from "@/lib/api/response";
import { getEmailsByWebsiteId } from "@/lib/delivery/delivery-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const { websiteId } = await params;
    const messages = await getEmailsByWebsiteId(websiteId);
    return jsonOk(messages);
  } catch (error) {
    return handleApiError(error);
  }
}
