import { handleApiError, jsonOk } from "@/lib/api/response";
import { DeliveryError, retryEmailDelivery } from "@/lib/delivery/delivery-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await retryEmailDelivery(id);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof DeliveryError) {
      return handleApiError(error);
    }
    return handleApiError(error);
  }
}
