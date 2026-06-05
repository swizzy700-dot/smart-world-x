import {
  ContactError,
  getContactExtractionByWebsiteId,
} from "@/lib/contacts/contact-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  try {
    const { websiteId } = await params;
    const record = await getContactExtractionByWebsiteId(websiteId);

    if (!record) {
      return jsonError("Contact extraction not found", 404, "NOT_FOUND");
    }

    return jsonOk(record);
  } catch (error) {
    if (error instanceof ContactError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
