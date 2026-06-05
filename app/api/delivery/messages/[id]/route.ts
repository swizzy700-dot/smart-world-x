import { handleApiError, jsonError, jsonOk } from "@/lib/api/response";
import { getEmailMessage } from "@/lib/delivery/delivery-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const message = await getEmailMessage(id);

    if (!message) {
      return jsonError("Email message not found", 404, "NOT_FOUND");
    }

    return jsonOk(message);
  } catch (error) {
    return handleApiError(error);
  }
}
